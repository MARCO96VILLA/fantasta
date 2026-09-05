import { useEffect, useRef } from 'react';

/**
 * Fa sì che il tasto/gesto "indietro" di Android chiuda una scheda aperta
 * (modale giocatore, sheet a scorrimento, card d'asta selezionata...) invece
 * di far uscire dalla pagina — cosa che su una SPA a hash può far perdere
 * filtri e scroll o addirittura chiudere l'app se non c'è altra cronologia.
 *
 * All'apertura viene aggiunta una voce "segnaposto" alla cronologia; il
 * "back" la consuma e chiama onClose invece di navigare altrove. Se la
 * scheda viene chiusa in altro modo (X, tap fuori, ecc.) la voce segnaposto
 * viene rimossa con un "back" automatico, per non lasciare un tasto indietro
 * fantasma che riapre la scheda già chiusa.
 */
export function useCloseOnBack(isOpen: boolean, onClose: () => void) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    history.pushState({ fantastaSheet: true }, '');
    pushedRef.current = true;

    const onPopState = () => {
      pushedRef.current = false;
      onClose();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        history.back();
      }
    };
    // onClose non è tra le dipendenze: cattura la funzione valida al momento
    // dell'apertura, che per i nostri usi (setState/close stabili) basta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
