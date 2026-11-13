import { $, api, utilisateur, message } from './commun.js';
$('nom-compte').textContent = utilisateur.nom;
$('date-compte').textContent = new Date(utilisateur.cree_le).toLocaleDateString('fr-FR');
$('changer-mdp').addEventListener('submit', async evenement => {
  evenement.preventDefault(); $('enregistrer-mdp').disabled = true; $('erreur-mdp').textContent = '';
  if ($('nouveau-mdp').value !== $('confirmation-mdp').value) {
    $('erreur-mdp').textContent = 'Les nouveaux mots de passe ne correspondent pas.'; $('enregistrer-mdp').disabled = false; return;
  }
  try {
    const resultat = await api('/auth/mot-de-passe', { method: 'POST', body: { ancien: $('ancien-mdp').value, nouveau: $('nouveau-mdp').value } });
    $('changer-mdp').reset(); message(resultat.message);
  } catch (exception) { $('erreur-mdp').textContent = exception.message; }
  finally { $('enregistrer-mdp').disabled = false; }
});
