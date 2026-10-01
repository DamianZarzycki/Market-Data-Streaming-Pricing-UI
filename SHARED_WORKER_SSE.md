# SharedWorker SSE hub — nota do nauki (frontend)

Ten dokument opisuje, **jak frontend `trading-infra` używa `SharedWorker`**, żeby wiele kart przeglądarki (i okien popout wykresu) korzystało z **tego samego strumienia live**, zamiast otwierać osobne połączenia SSE. Jest napisany jako materiał do wrzucenia w LLM w trybie nauki: najpierw model mentalny, potem mapowanie na pliki, potem przebiegi, potem pułapki.

Kod źródłowy (stan na 2026-08): nie zmieniaj go na podstawie tej noty. Nota jest opisem, nie specyfikacją do implementacji od zera.

---

## 0. Jedno zdanie, które trzeba zapamiętać

**SharedWorker nie synchronizuje stanu UI między kartami.**  
Synchronizuje **jedno połączenie `EventSource` na URL** i **rozsyła te same klatki SSE** do wszystkich subskrybentów. Każda karta i tak trzyma **własny** stan Reacta (tabele, historię cen, filtry) i **sama** dociąga snapshot REST.

Jeśli LLM ma zapamiętać tylko to, reszta dokumentu jest uzasadnieniem.

---

## 1. Problem, który to rozwiązuje

Bez `SharedWorker` każda karta (i każdy widok, który woła `new EventSource(url)`) otwiera **osobne** połączenie HTTP/SSE do backendu.

Przykład bez huba:

| Dokument | Co otwiera | Skutek |
| --- | --- | --- |
| Karta A, Market Data | `EventSource(/api/market-data/stream)` | połączenie 1 |
| Karta B, Market Data | `EventSource(/api/market-data/stream)` | połączenie 2 |
| Karta A, Pricing | `EventSource(/api/pricing/valuation-stream)` + listener `valuation_update` | połączenie 3 |
| Karta B, Blotter | to samo `/valuation-stream` | połączenie 4 |
| Popout wykresu | znowu `/api/market-data/stream` | połączenie 5 |

Backend dostaje N niezależnych klientów SSE. To marnuje gniazda, mnoży pracę serializacji po stronie serwera i sprawia, że liczniki „ile ticków przyszło” rozjeżdżają się między kartami (każda liczy od zera od momentu swojego `onopen`).

Z hubem:

- **1 `EventSource` na unikalny URL**, niezależnie od liczby kart.
- Market Data i popout wykresu dzielą `/api/market-data/stream`.
- Pricing i Blotter dzielą `/api/pricing/valuation-stream` (named event `valuation_update`).
- Nowa karta **dokleja się do już otwartego** źródła; nie restartuje strumienia.

To jest ten sam wzorzec co „jedno gniazdo WebSocket w shared workerze, N rendererów” — tutaj nośnikiem jest SSE (`EventSource`), nie WS.

---

## 2. Co jest współdzielone, a co nie

To najczęstsze nieporozumienie.

### Współdzielone (żyje w SharedWorker)

| Artefakt | Gdzie | Co z tego wynika dla nowej karty |
| --- | --- | --- |
| Instancja `EventSource` | `Map<url, StreamState>` w `createSseHub` | Nowa karta **nie** otwiera drugiego TCP/SSE |
| `receivedCount` | licznik klatek na poziomie połączenia | Nowa karta dostaje **aktualną** wartość w pierwszym `status` |
| Fan-out bieżących klatek | `broadcastDefault` / `broadcastNamed` | Od momentu `subscribe` obie karty widzą **te same przyszłe** eventy |
| Zbiory ról `app` / `chart` | `appPorts`, `chartPorts` | Popout wie, czy została jeszcze jakaś karta aplikacji |
| Heartbeat / stale sweep | `lastSeen` + `sweepStaleAppPorts` | Zamknięcie karty (nawet bez `port.onclose`) w końcu odłącza port |

### Nie współdzielone (żyje per dokument / per React tree)

| Artefakt | Gdzie | Co z tego wynika dla nowej karty |
| --- | --- | --- |
| Wiersze tabeli, filtry, sort | `useState` w widokach | Pusta tabela, dopóki karta **sama** nie zseeduuje REST + nie złapie live |
| Historia sparkline / price history | `Map<instrument, PricePoint[]>` w Market Data | Nowa karta zaczyna od snapshotu REST, **nie** od historii sąsiedniej karty |
| Bufor `useSseStream` (`events[]`) | hook, bounded, per mount | Brak replayu starych klatek z workera |
| Snapshot blottera (strona 50 trade’ów) | `fetchTrades` | Każda karta robi własny REST |
| Seed wykresu popout | `window.postMessage` opener → popup | SharedWorker **nie** przenosi historii punktów |

### Late-join: co nowa karta dostaje natychmiast

1. Wiadomość `status` z `readyState` istniejącego `EventSource` (`CONNECTED` / `CONNECTING` / `ERROR`) oraz **bieżącym** `receivedCount`.
2. Od tej pory — kolejne klatki `message`.

**Nie dostaje:**

- replayu klatek, które już poszły, zanim się podłączyła,
- kopii React state z innej karty,
- snapshotu rynkowego (to REST: `GET /snapshot` w `MarketDataView`).

Dlatego Market Data i Pricing **najpierw** ładują snapshot HTTP, **potem** wpinają się w SSE. SharedWorker dba o to, żeby SSE było wspólne; REST nadal jest per karta.

Komentarz w `frontend/README.md` mówi to wprost: hub **nie jest cache’em danych**.

---

## 3. SharedWorker vs Worker vs ServiceWorker (kontekst przeglądarki)

Żeby nie mylić trzech API:

| API | Proces / czas życia | Komunikacja | W tym projekcie |
| --- | --- | --- | --- |
| `Worker` (dedicated) | jeden owner (jedna karta) | jedno `MessagePort` | nieużywany do SSE |
| `SharedWorker` | jeden na **origin + nazwa skryptu + `name`**, wiele kart | każde `new SharedWorker()` → **nowy** port, ten sam proces workera | hub SSE + role app/chart |
| `ServiceWorker` | proxy sieciowy, przeżywa zamknięcie kart | `postMessage` / `FetchEvent` | nieużywany |

Kluczowe fakty `SharedWorker`:

1. Konstruktor `new SharedWorker(url, { type: "module", name: "trading-sse" })` **nie tworzy nowego procesu**, jeśli inny dokument tego samego originu już uruchomił workera o tej samej nazwie i tym samym skrypcie. Tworzy **nowe połączenie** (`MessagePort`).
2. Worker dostaje `self.onconnect`. `event.ports[0]` to port **tej** karty.
3. Trzeba wywołać `port.start()`, inaczej kolejka wiadomości nie płynie (szczególnie gdy listener jest ustawiony przez `onmessage` — w praktyce i tak wołamy `start()`).
4. Każde wywołanie `new SharedWorker(...)` w tej samej karcie (AppShell + hook SSE + ewentualnie druga subskrypcja) to **osobny port** do **tego samego** workera. Hub identyfikuje klientów po obiekcie portu, nie po karcie.
5. `SharedWorker` bywa niedostępny (`typeof SharedWorker === "undefined"`) albo rzuca przy konstrukcji — wtedy jest fallback na zwykły `EventSource` **w tej karcie**.

Vite bundluje skrypt workera przez:

```ts
new URL("../workers/shared-worker.ts", import.meta.url)
```

`type: "module"` jest wymagane, bo worker jest ESM/TS. Nazwa `"trading-sse"` **musi być identyczna** w `sharedSseClient.ts` i `sharedWorkerRole.ts` — inaczej powstałyby dwa niezależne workery i sharing by się rozjechał.

---

## 4. Mapa plików

```
frontend/src/
├── workers/
│   ├── shared-worker.ts          # entrypoint SharedWorker: onconnect + dispatch
│   ├── sharedSseHub.ts           # cała logika: EventSource registry, role, stale
│   ├── sharedSseProtocol.ts      # typy wiadomości inbound/outbound
│   └── sharedSseHub.test.ts      # specyfikacja zachowania (fake porty = fake karty)
├── services/
│   ├── sseClient.ts              # bezpośredni EventSource (fallback + kontrakt handlerów)
│   ├── sharedSseClient.ts        # most tab → worker: subscribe / message / status
│   ├── sharedWorkerRole.ts       # rejestracja roli app|chart + heartbeat
│   └── appPresence.ts            # BroadcastChannel: „żyje jeszcze jakaś karta app?”
├── hooks/
│   ├── useMarketDataStream.ts    # /api/market-data/stream (default frames)
│   ├── usePricingValuationStream.ts
│   ├── useBlotterLiveValuations.ts  # oba: /valuation-stream + event valuation_update
│   └── useSseStream.ts           # ogólny bounded buffer (też przez shared client)
├── layout/AppShell.tsx           # registerWorkerRole("app")
└── views/MarketDataView/
    ├── MarketChartPopout.tsx     # registerWorkerRole("chart") + ten sam market stream
    ├── openMarketChartWindow.ts  # window.open + seed historii przez postMessage
    └── chartPopoutProtocol.ts    # chart-ready / chart-seed
```

Warstwy od dołu:

```
[backend SSE endpoints]
        ▲
        │  jeden EventSource na URL
[shared-worker.ts → createSseHub]
        ▲
        │  MessagePort (structured clone)
[sharedSseClient / sharedWorkerRole]   ← jedna karta, często 2 porty
        ▲
[React hooks / AppShell / popout]
        ▲
[widoki: własny useState]
```

---

## 5. Protokół wiadomości

Zdefiniowany w `sharedSseProtocol.ts`. To jedyny kontrakt między dokumentem a workerem.

### Tab → worker (`SharedSseInbound`)

| `type` | Pola | Kto wysyła | Sens |
| --- | --- | --- | --- |
| `subscribe` | `url`, opcjonalnie `eventName` | `openSharedSseStream` | „chcę klatki z tego URL (ew. named event)” |
| `unsubscribe` | `url`, `eventName` | disposer hooka | zdejmij ten port z URL; zamknij `EventSource`, jeśli to ostatni |
| `register` | `role: "app" \| "chart"` | `registerWorkerRole` | ten port to karta aplikacji albo popout |
| `unregister` | — | `pagehide` / cleanup | natychmiastowe odłączenie portu |
| `heartbeat` | — | interval 2 s, tylko `app` | odśwież `lastSeen`; bez tego sweep uzna kartę za martwą |

Worker **ignoruje** payload, który nie jest obiektem albo nie ma znanego `type` (cisza, nie throw).

### Worker → tab (`SharedSseOutbound`)

| `type` | Pola | Kiedy |
| --- | --- | --- |
| `status` | `url`, `eventName?`, `status`, `receivedCount` | zaraz po `subscribe`; przy `onopen` / `onerror` źródła |
| `message` | `url`, `eventName?`, `data` (już sparsowane JSON), `receivedCount` | każda poprawna klatka SSE |
| `shutdown` | — | ostatni port `app` zniknął; **tylko** porty `chart` to dostają |

`SseStatus`: `CONNECTING` | `CONNECTED` | `RECONNECTING` | `ERROR` — ten sam union co w `sseClient.ts`.

Mapowanie `EventSource.readyState`:

- `0` CONNECTING → `"CONNECTING"`
- `1` OPEN → `"CONNECTED"`
- `2` CLOSED → `"ERROR"`
- `onerror` gdy źródło **nie** jest CLOSED → `"RECONNECTING"` (przeglądarka sama reconnectuje `EventSource`)

### Filtrowanie po stronie karty

`sharedSseClient` odrzuca wiadomości, które:

- mają `type === "shutdown"` (ten port jest od subskrypcji SSE, nie od roli; shutdown obsługuje `sharedWorkerRole`),
- mają inny `url` niż ten, na który ten port subskrybował,
- mają inne `eventName` (porównanie `a ?? "" === b ?? ""`).

Dlaczego filtr `url`? Bo **jeden port teoretycznie** mógłby dostać statusy z wielu URL-i, a klient jest 1:1 (jeden `openSharedSseStream` = jeden URL). Filtr jest pasem bezpieczeństwa.

---

## 6. Entrypoint workera (`shared-worker.ts`)

Bardzo cienki plik — celowo. Stan żyje w **jednej** instancji `createSseHub()` na cały worker (czyli na wszystkie karty).

Przy `onconnect`:

1. Weź `event.ports[0]`.
2. Ustaw `port.onmessage` → dispatch po `data.type` do huba.
3. Ustaw `port.onclose` → `hub.detachPort(port)`. W komentarzach i w `appPresence.ts` jest wprost: **`MessagePort.onclose` przy zamykaniu karty często nie odpala**. Dlatego to nie jest jedyna ścieżka sprzątania.
4. `port.start()`.
5. Osobno: `setInterval(() => hub.sweepStaleAppPorts(), 1000)` — globalny zegar workera, nie per port.

Nie ma tu cache’u ticków. Nie ma tu Reacta. Nie ma REST.

---

## 7. Hub (`createSseHub`) — serce systemu

### 7.1 Struktury

```text
streams: Map<url, StreamState>
  StreamState:
    source: EventSource
    ports: Map<HubPort, eventName | undefined>   # kto słucha tego URL
    namedListeners: Map<eventName, listener>     # addEventListener na źródle
    receivedCount: number                        # klatki sparsowane z JSON

appPorts: Set<HubPort>
chartPorts: Set<HubPort>
lastSeen: Map<HubPort, timestamp>
```

`HubPort` w produkcji to prawdziwy `MessagePort`. W testach — obiekt z `postMessage`, który zbiera tablicę `messages`. Testy **są** modelem „N kart”: każdy `fakePort()` = jedna strona połączenia.

### 7.2 `subscribe(port, url, eventName?)`

1. Jeśli nie ma `streams.get(url)` → `openStream(url)` → `new EventSource(url)`.
2. `state.ports.set(port, eventName)` — **jeden** eventName na parę (port, url). Ponowny subscribe tego samego portu na ten sam URL nadpisuje nazwę.
3. Jeśli jest `eventName`, dołóż `addEventListener(eventName, ...)` na źródle (raz na nazwę, nie raz na port).
4. Natychmiast wyślij temu portowi `status` z aktualnym `readyState` i `receivedCount`.

To jest mechanizm late-join: karta B wchodzi, źródło już `OPEN`, `receivedCount === 2` → B od razu pokazuje KPI „2”, mimo że nie widziała tych dwóch klatek.

### 7.3 Fan-out klatek

Dwie ścieżki, bo SSE ma dwa style:

**Default frames** (`data:` bez `event:`) — market-data `/stream`:

- `source.onmessage`
- `broadcastDefault`: wyślij tylko do portów, których `eventName` jest puste / undefined.

**Named frames** (`event: valuation_update`) — pricing `/valuation-stream`:

- `source.addEventListener("valuation_update", listener)`
- `broadcastNamed`: wyślij tylko do portów, których zapisane `eventName === "valuation_update"`.

Parsowanie JSON jest **w workerze** (`JSON.parse`). Złe JSON (keep-alive, śmieci) są cicho pomijane — `receivedCount` **nie** rośnie. Potem `postMessage` robi structured clone obiektu do każdej karty. Karta dostaje już obiekt, nie string.

Konsekwencja: CPU parsu jest raz na połączenie, nie N razy. N kopii i tak idzie przez `postMessage` + React. `FRONTEND_GAPS_SSE_OVERVIEW.md` wciąż narzeka na pracę na UI thread — to dotyczy **React setState / merge wierszy**, nie samego `JSON.parse` źródła (ten jest w workerze, o ile SharedWorker działa).

### 7.4 `unsubscribe` i lifetime połączenia

- Zdejmij port z `state.ports`.
- `dropUnusedNamedListeners` — jeśli nikt już nie słucha danej nazwy, `removeEventListener`.
- Jeśli `ports.size === 0` → `source.close()` i usuń URL z mapy.

Zamknięcie karty A **nie** zamyka strumienia, dopóki karta B (albo popout) nadal subskrybuje. Test: `"keeps the connection open until the last tab unsubscribes"`.

### 7.5 Role `app` vs `chart`

To **osobny** byt od subskrypcji SSE. Ten sam worker obsługuje dwa problemy:

1. Sharing EventSource.
2. „Zamknij popouty wykresu, gdy użytkownik zamknął ostatnią kartę aplikacji.”

`register(port, role)`:

- `app` → dodaj do `appPorts`, usuń z `chartPorts` (port nie może być w obu).
- `chart` → odwrotnie.
- zawsze `touch(port)` (wpis w `lastSeen`).

`detachPort(port)`:

1. Zapamiętaj `wasLastApp = ten port był w appPorts i size === 1`.
2. Usuń z obu zbiorów i z `lastSeen`.
3. `unsubscribe` ten port z **wszystkich** URL-i (port mógł jednocześnie trzymać subskrypcję — w praktyce role i SSE idą **osobnymi** portami, ale detach jest defensywny).
4. Jeśli `wasLastApp` → `broadcastShutdown()` do wszystkich `chartPorts`.

Popout (`MarketChartPopout`) na `shutdown` woła `window.close()`.

### 7.6 Heartbeat i stale sweep

Dlaczego: zamknięcie karty / crash / `about:blank` często **nie** wywołuje `port.onclose` ani nawet `pagehide` w sposób, na którym można polegać w 100%.

- Karta `app` co **2 s** (`HEARTBEAT_MS`) wysyła `{ type: "heartbeat" }`.
- Worker co **1 s** woła `sweepStaleAppPorts`.
- Jeśli `now - lastSeen > 4000` (`DEFAULT_STALE_MS`) dla portu w `appPorts` → `detachPort`.
- Porty `chart` **nie** są zamiatane tym sweepem (iteracja tylko po `appPorts`). Chart bez heartbeat nie zabije sam siebie.

`heartbeat` ignoruje porty, które nigdy nie zrobiły `register` (subskrypcja SSE bez roli nie jest „życiem aplikacji”).

### 7.7 Jedno ograniczenie modelu portu

`state.ports` to `Map<port, eventName | undefined>`. Jeden port = jeden eventName na dany URL.

To jest OK, bo:

- `openSharedSseStream` tworzy **nowy** `SharedWorker` → **nowy** port per subskrypcja.
- `registerWorkerRole` tworzy **kolejny** port.

Jedna karta aplikacji z otwartym Market Data to typowo:

1. port roli `app` (heartbeat),
2. port subskrypcji `/api/market-data/stream`.

Gdyby ktoś z jednego portu zrobił dwa `subscribe` na ten sam URL z różnymi `eventName`, druga nazwa nadpisałaby pierwszą. Obecny kod tego nie robi.

---

## 8. Klient w karcie (`sharedSseClient.ts`)

Publiczne API:

```ts
openSharedSseStream<T>(url, handlers: SseHandlers<T>): () => void
```

Ten sam kontrakt co `openSseStream` z `sseClient.ts`, żeby hooki nie wiedziały, czy lecą przez worker.

`SseHandlers`:

- `onMessage(data: T)` — obowiązkowe
- `onStatusChange?(status)`
- `onReceivedCount?(count)` — **licznik połączenia**, nie „ile ta karta zobaczyła”
- `onError?` — używany tylko w fallbacku bezpośrednim
- `eventName?` — named SSE

Przepływ `connectViaWorker`:

1. `handlers.onStatusChange("CONNECTING")` lokalnie (zanim worker odpowie).
2. `new SharedWorker(..., { type: "module", name: "trading-sse" })`.
3. `port.start()` + `{ type: "subscribe", url, eventName }`.
4. Na `message`: podbij `onReceivedCount`, potem status albo `onMessage`.
5. Disposer: `{ type: "unsubscribe" }` + `port.close()`.
6. `worker.onerror` → `ERROR` i zamknięcie portu.

Fallback:

- brak `SharedWorker` w runtime,
- albo konstruktor rzuci,

→ `openSseStream` (prawdziwy `EventSource` **w tej karcie**). Wtedy sharing znika; każda karta ma własne połączenie i własny licznik od zera.

---

## 9. Role i obecność aplikacji (`sharedWorkerRole.ts` + `appPresence.ts`)

### 9.1 Po co dwa mechanizmy shutdownu popoutów?

| Mechanizm | Kanał | Siła | Słabość |
| --- | --- | --- | --- |
| SharedWorker `shutdown` | MessagePort | ten sam proces co SSE; wie o wszystkich kartach originu | `onclose` zawodny; worker może przeżyć w dziwnym stanie |
| `BroadcastChannel("trading-app-presence")` | osobny, między dokumentami | lepiej przeżywa close karty | nie wie nic o SSE; to tylko „czy ktoś jeszcze żyje” |

Popout nasłuchuje **obu**. Który pierwszy stwierdzi „ostatnia karta app zniknęła”, ten woła `onShutdown` → `window.close()`.

### 9.2 Rejestracja `app` — ref-count na StrictMode

`AppShell`:

```ts
useEffect(() => registerWorkerRole("app"), []);
```

React 18 StrictMode w dev **mountuje, unmountuje, mountuje ponownie**. Gdyby `unregister` poszło synchronicznie przy pierwszym unmount, worker uznałby `wasLastApp` i **pozabijał popouty** w środku remountu.

Dlatego `retainAppPresence`:

- licznik `appPresenceCount` w module (per dokument, nie per worker),
- dopiero przejście `0 → 1` startuje BroadcastChannel + port `app`,
- disposer zmniejsza licznik; przy `0` **nie** sprząta od razu, tylko `queueMicrotask`, i sprząta tylko jeśli nadal 0.

To jest lokalne (jedna karta), nie globalne między kartami. Między kartami liczy worker (`appPorts.size`) i BroadcastChannel (zbiór id).

### 9.3 Heartbeat i `pagehide`

Port `app`:

- `setInterval` 2 s → `{ type: "heartbeat" }`,
- `pagehide` i `beforeunload` → `{ type: "unregister" }` (best-effort; przy kill karty może nie dojść).

### 9.4 BroadcastChannel protocol

Kanał: `"trading-app-presence"`.

| Msg | Kierunek | Sens |
| --- | --- | --- |
| `{ type: "alive", id }` | app → wszyscy | „wciąż tu jestem”; co 1 s |
| `{ type: "bye", id }` | app → wszyscy | tab się zamyka |
| `{ type: "who" }` | chart → app | „odezwijcie się”; chart pyta przy starcie |

Chart trzyma `Map<id, lastSeen>`. Sweep co 500 ms: wpis starszy niż 3 s (`STALE_MS`) wypada. Jeśli po `GRACE_MS` (1.5 s od startu watchera) mapa jest pusta → `onAllGone`.

Grace jest po to, żeby popout otwarty **chwilę przed** pierwszym `alive` nie zamknął się natychmiast (race: chart startuje, jeszcze nie dostał pinga).

### 9.5 Fallback bez SharedWorker

Dla roli `chart`: poll `window.opener.closed` co 1 s. Klasyczny model „popup żyje, dopóki żyje opener”. Nie widzi **innych** kart aplikacji — tylko opener. To gorsze niż worker, ale bezpieczne.

---

## 10. Kto subskrybuje jakie URL-e

Endpointy z `endpoints.ts` (prefix `/api/...`, proxy Vite na mikroserwisy):

| Hook / widok | URL | `eventName` | Uwagi |
| --- | --- | --- | --- |
| `useMarketDataStream` | `/api/market-data/stream` | brak (default `onmessage`) | Market Data view + chart popout |
| `usePricingValuationStream` | `/api/pricing/valuation-stream` | `valuation_update` | Pricing view |
| `useBlotterLiveValuations` | `/api/pricing/valuation-stream` | `valuation_update` | Blotter patchuje wiersze live |
| `useSseStream` | dowolny | opcjonalny | bounded buffer; idzie przez ten sam client |

Monitoring **nie** trzyma EventSource w UI. Pasek „SSE connection status” jest **wnioskowany z health probe’ów** backendu, nie z `readyState` huba.

Dwa widoki (Pricing + Blotter) na **tym samym** URL i **tej samej** nazwie eventu → w hubie **jeden** `EventSource`, dwóch (lub więcej) subskrybentów. Test: `"shares one EventSource for blotter and pricing on /valuation-stream"`.

Różne URL-e → różne źródła. Test: market + valuation = 2 instancje.

---

## 11. `receivedCount` i spójność KPI między kartami

Licznik jest **per połączenie EventSource**, inkrementowany w workerze przy każdej udanej klatce (default albo named).

Hooki Market Data i Pricing:

1. Przy pierwszym `onReceivedCount` wysyłają „pusty batch” z samym `streamReceivedCount` (seed KPI bez ruszania tabeli).
2. Widok robi `setTicksReceived(count)` / `setUpdates(count)`.
3. Jeśli `streamReceivedCount == null` (tryb fallback bez workera), widok inkrementuje lokalnie o `ticksInBatch` / `eventsInBatch`.

Dzięki temu:

- karta A od godziny, karta B otwarta teraz → obie pokazują **tę samą** liczbę klatek na wspólnym streamie,
- B nie „zaczyna od zera”,
- B **nie** dostaje jednak tych klatek do tabeli — tabela B pochodzi ze snapshotu REST + live od momentu join.

Blotter **nie** eksponuje tego licznika w analogiczny sposób (hook nie podaje `onReceivedCount`).

---

## 12. Popout wykresu — sharing streamu vs seed historii

Dwa niezależne kanały, łatwo je pomylić.

### A. Live ticks — SharedWorker

`MarketChartPopout` woła `useMarketDataStream`, czyli `openSharedSseStream(endpoints.marketData.stream)`. Jeśli użytkownik ma otwarty Market Data w karcie app, popout **dokleja się** do tego samego `EventSource`. Nie ma drugiego połączenia do market-data-service.

Popout filtruje batche po `instrumentKey` z query string i dokleja punkty do lokalnego `points[]`.

### B. Historia sparkline — `window.postMessage`, nie worker

`openMarketChartWindow`:

1. `window.open("/popout/market-chart?instrument=...")`.
2. Czeka na `{ type: "chart-ready" }` z popupu (same origin, `event.source === popup`).
3. Odsyła `{ type: "chart-seed", points }` — **kopię** historii, którą karta app już zebrała w React state.

Worker **nie** trzyma historii cen. Gdyby trzymał, nowa karta Market Data też mogłaby dostać sparkline bez REST. Świadomie tego nie ma: hub ma być cienki.

### C. Cykl życia popoutu

- `registerWorkerRole("chart", () => window.close())`.
- Dodatkowo `watchAppTabPresence`.
- Gdy ostatnia karta `app` znika (worker albo BroadcastChannel) → popup się zamyka.
- Limit: `MAX_CHART_POPOUTS = 50` (lokalna lista `Window` w openerze, nie w workerze).

Trasa: `/popout/market-chart` jest **poza** `AppShell`, więc popout **nie** rejestruje roli `app`. To ważne: gdyby popout był dzieckiem `AppShell`, worker widziałby go jako kartę aplikacji i nigdy by nie wysłał `shutdown`.

---

## 13. Scenariusze (przebiegi krok po kroku)

Użyj ich jako ćwiczeń dla LLM: „opowiedz, co się dzieje w hubie”.

### 13.1 Pierwsza karta, Market Data

1. `AppShell` mount → `registerWorkerRole("app")` → `new SharedWorker` #portP → `register app` + start BroadcastChannel `alive`.
2. `MarketDataView` ładuje `GET /snapshot` (REST, poza workerem).
3. `useMarketDataStream` → `new SharedWorker` #portS → `subscribe /api/market-data/stream`.
4. Hub: brak streamu → `new EventSource`. `receivedCount = 0`. Port dostaje `status CONNECTING`.
5. `onopen` → broadcast `CONNECTED` do portów tego URL (tu: tylko portS).
6. Tick JSON → parse → `receivedCount = 1` → `message` do portS → hook coalescuje 100 ms → React merge.

### 13.2 Druga karta, ten sam widok

1. Nowa karta: znowu `new SharedWorker` z tą samą nazwą → **ten sam** proces workera, nowe porty (app + subscribe).
2. `subscribe` na istniejący URL → **nie** woła `new EventSource`.
3. Natychmiastowy `status` z `receivedCount = N` (seed KPI).
4. Snapshot REST tej karty jest niezależny — może być o ułamek sekundy inny niż tabela karty A, potem obie zjadają te same live klatki.

### 13.3 Blotter w karcie A, Pricing w karcie B

1. Oba `subscribe(url=valuation-stream, eventName=valuation_update)`.
2. Jeden `EventSource`. Named listener dodany raz.
3. Każda `valuation_update` → oba porty dostają ten sam `data` i ten sam `receivedCount`.
4. Blotter aplikuje update tylko do wierszy, które ma na bieżącej stronie REST. Pricing trzyma własną mapę trade’ów. **Dane biznesowe nadal nie są wspólnym store’em.**

### 13.4 Popout przy żywej karcie Market Data

1. Opener ma już EventSource market.
2. Popout: rola `chart` + `subscribe` market stream → `ports.size` rośnie, źródło zostaje.
3. Seed historii osobnym `postMessage`.
4. Zamknięcie popoutu: `unsubscribe` / `detachPort` chart → źródło żyje, bo karta app nadal subskrybuje.

### 13.5 Zamknięcie ostatniej karty app przy otwartym popoucie

1. `pagehide` → `unregister` (jeśli zdąży) **albo** brak heartbeat > 4 s → `sweepStaleAppPorts` → `detachPort`.
2. `wasLastApp` → `{ type: "shutdown" }` do chart ports.
3. Równolegle BroadcastChannel: brak `alive`, mapa pusta po grace → `window.close()`.
4. Gdy nikt nie subskrybuje market URL → `EventSource.close()`.

### 13.6 StrictMode remount

1. Unmount: `appPresenceCount` 1→0, cleanup zaplanowany na microtask.
2. Remount w tej samej macrotask: count 0→1.
3. Microtask widzi count > 0 → **nie** woła `unregister`. Popout przeżywa.

### 13.7 Brak SharedWorker (np. stary silnik)

1. `openSharedSseStream` → `openSseStream` per karta.
2. Role: chart polluje `opener.closed`.
3. KPI `receivedCount` nie jest współdzielone; widoki spadają na lokalny increment.

---

## 14. Co testy uważają za prawo

`sharedSseHub.test.ts` jest specyfikacją. Fake `EventSource.instances.length` = ile prawdziwych połączeń worker by otworzył.

Gwarancje:

1. Dwa subskrybenty tego samego URL → 1 źródło.
2. Blotter + Pricing na valuation named event → 1 źródło.
3. Dwa różne URL-e → 2 źródła.
4. Unsubscribe jednego z dwóch nie zamyka źródła; ostatni zamyka.
5. Jedna klatka default → identyczny `message` na obu portach, `receivedCount: 1`.
6. Named event analogicznie.
7. Late join dostaje `status.receivedCount` równy liczbie już przetworzonych klatek (nie zero).
8. `detachPort` jednej z dwóch kart `app` **nie** wysyła `shutdown` do chart.
9. `detachPort` ostatniego `app` wysyła `shutdown`.
10. Brak heartbeat dłużej niż `staleMs` traktuje `app` jako martwy (shutdown chart).
11. Heartbeat w oknie stale utrzymuje charty.

Nie ma testów e2e przeglądarki na prawdziwym `SharedWorker`. Hub jest testowalny, bo `createEventSource` i `now()` są wstrzykiwane.

---

## 15. Świadome ograniczenia (ucz się ich jako trade-off, nie jako bugów)

1. **Brak replayu / cache’u payloadów w workerze.** Nowa karta nie dostaje historii ticków z workera. Snapshot REST + live od join. To utrzymuje workera małym i bez backpressure policy.
2. **Brak współdzielonego stanu React.** Filtry, zaznaczenie wiersza, strona blottera — per karta. To nie Redux w SharedWorker.
3. **JSON.parse w workerze, React na głównym wątku.** Sharing połączenia ≠ brak pracy UI. Wysoki FPS nadal boli widoki (merge map, sort, 1 s tick LIVE/STALE).
4. **`postMessage` fan-out jest N-krotny.** 5 kart = 5 structured clone’ów tej samej klatki. Nadal taniej niż 5 TCP do backendu.
5. **Same origin + ta sama nazwa workera.** Karta na innym porcie / originie = inny worker.
6. **Safari / środowiska bez SharedWorker** → degeneracja do N połączeń. UI ma działać, nie ma assertować globalnego singeltona.
7. **`MessagePort.onclose` jest niewiarygodny** — stąd heartbeat 2 s / stale 4 s / BroadcastChannel. Przy projektowaniu podobnego huba zawsze zakładaj, że close jest best-effort.
8. **Worker nie wie o REST.** Jeśli backend zrestartuje SSE, `EventSource` reconnectuje sam; karty dostaną `RECONNECTING` → `CONNECTED`. Snapshotu worker nie odświeży.
9. **Named vs default nie mieszają się na jednym porcie.** Port z `eventName` nie dostaje `onmessage` default i odwrotnie. To celowe: valuation nie ma wyciekać na market hook i odwrotnie.
10. **Licznik klatek to nie „ile wierszy w tabeli”.** To klatki na połączeniu. Pricing coalescuje po `trade_id` w oknie 100 ms, więc KPI `updates` (shared count) ≠ liczba przerysowań.

---

## 16. Słowniczek (do promptu)

- **SharedWorker** — jeden worker JS współdzielony przez dokumenty tego samego originu; każde połączenie to `MessagePort`.
- **Hub / `createSseHub`** — rejestr `EventSource` keyed by URL + zbiory ról.
- **Port** — jeden koniec MessageChannel między konkretnym `new SharedWorker()` a hubem. Nie jest tożsamy z kartą (karta ma zwykle ≥2 porty).
- **Subscribe** — port chce klatki z URL.
- **Register** — port deklaruje rolę `app` albo `chart`.
- **Fan-out** — jedna klatka z `EventSource` → `postMessage` do każdego portu spełniającego filtr eventName.
- **Late join** — nowy port na już otwartym URL; dostaje status + przyszłe klatki, nie historię.
- **`receivedCount`** — monotoniczny licznik udanych JSON-klatek na jednym EventSource.
- **Stale sweep** — worker uznaje port `app` za martwy, jeśli nie było heartbeat / register touch przez `staleMs`.
- **App presence** — BroadcastChannel, drugi sygnał „czy została karta aplikacji”, głównie dla popoutów.
- **Fallback** — zwykły `EventSource` w dokumencie, gdy SharedWorker nie istnieje.

---

## 17. Pytania kontrolne (tryb nauki)

Odpowiedzi są w tym dokumencie i w kodzie; LLM powinien umieć je wyprowadzić.

1. Czy otwarcie drugiej karty na `/market-data` tworzy drugi `EventSource`? Kiedy tak, kiedy nie?
2. Czy tabela ticków w karcie B jest kopią tabeli z karty A w chwili otwarcia? Skąd B bierze wiersze?
3. Pricing i Blotter: ile połączeń SSE, jeśli obie karty żyją? A jeśli obie są w **jednej** karcie (nawigacja, unmount)?
4. Po co `name: "trading-sse"` w dwóch plikach? Co się stanie, jeśli nazwy się rozjadą?
5. Dlaczego popout jest poza `AppShell`?
6. Dlaczego `retainAppPresence` używa `queueMicrotask`?
7. Które wiadomości idą worker → chart przy śmierci ostatniego appa? Który kanał jest redundantny i po co?
8. Late join: jaki jest pierwszy payload, który nowa karta dostaje z workera, zanim przyjdzie kolejny tick?
9. Czy `heartbeat` od portu subskrypcji SSE (bez `register`) utrzymuje charty przy życiu?
10. Gdzie dzieje się `JSON.parse` przy happy path ze SharedWorker, a gdzie przy fallbacku?

---

## 18. Minimalny model do narysowania z pamięci

```text
Tab A (AppShell)          Tab B                    Popout
  port-app ──┐              port-app ──┐             port-chart ──┐
  port-md  ──┤              port-val ──┤             port-md    ──┤
             │                         │                          │
             ▼                         ▼                          ▼
        ┌─────────────────────────────────────────────────────────┐
        │  SharedWorker "trading-sse"                             │
        │  appPorts={A,B}  chartPorts={P}  lastSeen{...}          │
        │  streams[                                     ]         │
        │    /market-data/stream  → EventSource #1  ports{A,P}    │
        │    /valuation-stream    → EventSource #2  ports{B}      │
        └─────────────────────────────────────────────────────────┘
             │                         │
             ▼                         ▼
     market-data-service         pricing-service
```

Nowa karta C na Market Data: dokładany jest `port-app` i `port-md` do **tego samego** EventSource #1. Nie powstaje EventSource #3.

---

## 19. Źródła w repo (czytaj w tej kolejności)

1. `src/workers/sharedSseProtocol.ts` — kontrakt.
2. `src/workers/shared-worker.ts` — wiring `onconnect`.
3. `src/workers/sharedSseHub.ts` — algorytm.
4. `src/workers/sharedSseHub.test.ts` — oczekiwane zachowanie.
5. `src/services/sharedSseClient.ts` — strona karty dla SSE.
6. `src/services/sharedWorkerRole.ts` + `src/services/appPresence.ts` — role i obecność.
7. Hooki `useMarketDataStream` / `usePricingValuationStream` / `useBlotterLiveValuations`.
8. `src/layout/AppShell.tsx`, `src/views/MarketDataView/MarketChartPopout.tsx`.
9. `frontend/README.md` sekcja „Live data and caches” (hub ≠ cache).

Koniec noty.
