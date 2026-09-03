# Fantasta

Web app per preparare e gestire l'**asta del Fantacalcio Serie A 2026/27**.
Lega Classic, 12 squadre, 500 crediti, rosa 3-8-8-6. Funziona **offline**; i dati
dell'utente stanno nel browser (localStorage) con export/import JSON per backup.

## Avvio

```bash
npm install
npm run dev
```

Durante l'asta tienila aperta in locale (`npm run dev`). Nessun server necessario.

## Sezioni

- **Preparazione** – listone completo filtrabile e ordinabile; tag personalizzati,
  prezzo massimo obiettivo, interesse e note per giocatore.
- **Asta** – barra di ricerca → scheda giocatore → registri prezzo e squadra
  acquirente. `Alt`+`1…0` seleziona la squadra, `Invio` conferma, "Annulla ultimo".
- **Squadre** – tabellone: rose, spesa, crediti residui, slot per reparto,
  offerta massima possibile.
- **Impostazioni** – nomi delle 12 squadre, la tua squadra, budget/rosa/tetti,
  editor dei tag, backup.

## Dati

Il catalogo (`src/data/players.json`) è generato dalla pipeline a partire dai file
Excel ufficiali di fantacalcio.it in `raw/`:

| file in `raw/` | contenuto |
|---|---|
| `Quotazioni_Fantacalcio_Stagione_2026_27.xlsx` | listone stagione corrente (anagrafica, ruoli, Qt.A, FVM) |
| `Statistiche_Fantacalcio_Stagione_20XX_YY.xlsx` | statistiche per stagione (Pv, Mv, Fm, gol, assist, rigori, cartellini) |

Le schede di [fantacalciopedia.com](https://www.fantacalciopedia.com) aggiungono
skill tag (rigorista, assistman, titolare, buona media, goleador, fuoriclasse),
proiezioni stagionali e il punteggio dell'algoritmo. Match esatto tramite `Id`.

### Rigenerare il catalogo

```bash
npm run scrape   # scarica/aggiorna le schede fantacalciopedia in scripts/.cache/
npm run data     # rilegge raw/ + cache e riscrive src/data/players.json
```

`npm run data` funziona anche senza la cache fantacalciopedia (solo listone +
statistiche). Da rilanciare quando escono quotazioni aggiornate prima dell'asta.

### Indice di convenienza

Per ogni reparto si stima `fm ≈ a + b·log(Qt.A)` sui giocatori con storico in
Serie A; la **convenienza** (0–100) misura di quanto il rendimento storico del
giocatore supera quello tipico della sua fascia di prezzo. È un'euristica:
i giocatori senza storico Serie A non hanno un valore (—).

## Usarlo dal telefono (offline)

L'app è una **PWA**: si installa sul telefono e poi funziona **senza connessione**.
I dati dell'asta restano nel telefono (localStorage).

### 1. Pubblicare su GitHub Pages (una volta)

1. Crea un repo su GitHub e fai push di questo progetto sul branch `main`.
2. Repo → **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. Ad ogni push su `main` il workflow `.github/workflows/deploy.yml` builda e pubblica.
   L'URL è `https://<tuo-utente>.github.io/<nome-repo>/`.

> Il `base` viene impostato in automatico dal nome del repo. In locale
> `npm run build` usa `/fantasta/`: se il repo ha un altro nome passa
> `VITE_BASE=/nome-repo/ npm run build`.

### 2. Installare sul telefono (una volta, con connessione)

- Apri l'URL nel browser del telefono.
- **iPhone (Safari)**: Condividi → *Aggiungi a Home*.
- **Android (Chrome)**: menu ⋮ → *Installa app* / *Aggiungi a schermata Home*.

Da lì in poi si apre come un'app a schermo intero e funziona anche in aereo.
Quando aggiorni il listone (push su `main`), la versione nuova entra da sola al
successivo avvio con connessione.

### 3. All'asta

Tutto offline dal telefono: prepari i tag, cerchi i giocatori, registri prezzo e
squadra. Da **Impostazioni → Esporta backup** puoi salvarti un JSON di sicurezza
(mandartelo via mail/WhatsApp) e reimportarlo se cambi telefono.

## Stack

Vite + React + TypeScript, Zustand (persist), Fuse.js, React Router (hash),
`vite-plugin-pwa` (service worker offline). Pipeline dati in `scripts/`
(Node + `tsx`, SheetJS, Cheerio). Icone: `npm run icons`.
