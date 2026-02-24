import { Link } from 'react-router-dom';

const Confidentialite = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/" className="text-blue-200 hover:text-white text-sm mb-4 inline-block">
            ← Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-bold">Politique de Confidentialité</h1>
          <p className="text-blue-200 mt-2">Dernière mise à jour : 24 février 2026</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">

          {/* Introduction */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              CVBN CONSULTING, éditrice de la plateforme ExtraTaff, accorde une importance particulière à la protection de vos données personnelles. La présente politique de confidentialité a pour objet de vous informer sur la manière dont nous collectons, utilisons et protégeons vos données, conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée.
            </p>
          </section>

          {/* Responsable de traitement */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Responsable du traitement</h2>
            <div className="bg-gray-50 rounded-lg p-5 text-gray-700 space-y-1">
              <p><strong>CVBN CONSULTING</strong> (nom commercial : ExtraTaff)</p>
              <p>SASU au capital de 500,00 €</p>
              <p>1, sente aux Pruniers — 27120 Gadencourt</p>
              <p>SIRET : 984 685 933 00017</p>
              <p>Responsable : Christophe Basset, Président</p>
              <p>Email : christophe@comunecom.fr</p>
            </div>
          </section>

          {/* Données collectées */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Données personnelles collectées</h2>
            <div className="text-gray-700 leading-relaxed space-y-4">
              <div>
                <p className="font-semibold mb-2">Pour les talents (extras) :</p>
                <p>Nom, prénom, adresse email, numéro de téléphone, département de résidence, postes recherchés (type de métier), expérience professionnelle, disponibilités, photo de profil (optionnelle).</p>
              </div>
              <div>
                <p className="font-semibold mb-2">Pour les établissements :</p>
                <p>Nom de l'établissement, adresse email, numéro de téléphone, adresse postale, département, type d'établissement, numéro SIRET (optionnel), nom du responsable, informations de paiement (traitées par Stripe).</p>
              </div>
              <div>
                <p className="font-semibold mb-2">Données collectées automatiquement :</p>
                <p>Données de connexion (adresse IP, type de navigateur, date et heure d'accès), données d'utilisation de la plateforme (missions consultées, candidatures envoyées, messages échangés).</p>
              </div>
            </div>
          </section>

          {/* Finalités */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Finalités du traitement</h2>
            <div className="text-gray-700 leading-relaxed space-y-2">
              <p>Vos données personnelles sont collectées et traitées pour les finalités suivantes :</p>
              <div className="mt-3 space-y-2 pl-4">
                <p>— Création et gestion de votre compte utilisateur</p>
                <p>— Mise en relation entre établissements et talents (matching)</p>
                <p>— Publication et gestion des missions</p>
                <p>— Traitement des candidatures</p>
                <p>— Messagerie entre utilisateurs</p>
                <p>— Envoi de notifications (email, SMS, push) relatives aux missions et candidatures</p>
                <p>— Gestion des abonnements et paiements</p>
                <p>— Amélioration continue de la plateforme et du service</p>
                <p>— Respect de nos obligations légales et fiscales</p>
              </div>
            </div>
          </section>

          {/* Base légale */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Base légale du traitement</h2>
            <div className="text-gray-700 leading-relaxed space-y-2">
              <p><strong>Exécution du contrat :</strong> le traitement est nécessaire à l'exécution du service de mise en relation (inscription, matching, candidatures, messagerie, paiements).</p>
              <p><strong>Consentement :</strong> pour l'envoi de communications commerciales et les notifications SMS.</p>
              <p><strong>Intérêt légitime :</strong> pour l'amélioration du service, la sécurité de la plateforme et la prévention de la fraude.</p>
              <p><strong>Obligation légale :</strong> pour la conservation des données de facturation et de transaction.</p>
            </div>
          </section>

          {/* Destinataires */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Destinataires des données</h2>
            <div className="text-gray-700 leading-relaxed space-y-3">
              <p>Vos données personnelles sont accessibles exclusivement aux personnes et entités suivantes :</p>
              <p><strong>En interne :</strong> le responsable du traitement (Christophe Basset) et les éventuels collaborateurs habilités de CVBN CONSULTING.</p>
              <p><strong>Aux autres utilisateurs :</strong> dans le cadre de la mise en relation (un établissement voit le profil du talent candidat, un talent voit les informations de la mission et de l'établissement). Les adresses exactes ne sont jamais communiquées — seul le département et la ville sont affichés.</p>
              <p><strong>Aux sous-traitants techniques :</strong> exclusivement dans le cadre de la fourniture du service.</p>
            </div>
          </section>

          {/* Sous-traitants */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Sous-traitants</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-700 mt-2">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 font-semibold">Sous-traitant</th>
                    <th className="text-left p-3 font-semibold">Finalité</th>
                    <th className="text-left p-3 font-semibold">Localisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="p-3">Supabase</td>
                    <td className="p-3">Hébergement base de données, authentification</td>
                    <td className="p-3">Singapour / UE (données hébergées en UE)</td>
                  </tr>
                  <tr>
                    <td className="p-3">Netlify</td>
                    <td className="p-3">Hébergement du site web</td>
                    <td className="p-3">États-Unis</td>
                  </tr>
                  <tr>
                    <td className="p-3">Stripe</td>
                    <td className="p-3">Traitement des paiements</td>
                    <td className="p-3">États-Unis / UE</td>
                  </tr>
                  <tr>
                    <td className="p-3">Brevo (ex-Sendinblue)</td>
                    <td className="p-3">Envoi d'emails et de SMS</td>
                    <td className="p-3">France</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-600 text-sm mt-3">
              Les transferts de données vers des pays situés hors de l'Union européenne sont encadrés par des garanties appropriées (clauses contractuelles types, décision d'adéquation ou certification).
            </p>
          </section>

          {/* Durée de conservation */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Durée de conservation</h2>
            <div className="text-gray-700 leading-relaxed space-y-2">
              <p><strong>Données de compte :</strong> conservées pendant toute la durée d'utilisation du service, puis supprimées dans un délai de 3 ans après la dernière activité du compte.</p>
              <p><strong>Données de facturation :</strong> conservées pendant 10 ans conformément aux obligations comptables et fiscales.</p>
              <p><strong>Messages et candidatures :</strong> conservés pendant 2 ans après la fin de la mission concernée.</p>
              <p><strong>Données de connexion :</strong> conservées pendant 1 an.</p>
            </div>
          </section>

          {/* Droits */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Vos droits</h2>
            <div className="text-gray-700 leading-relaxed space-y-3">
              <p>Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :</p>
              <div className="space-y-2 pl-4">
                <p><strong>Droit d'accès :</strong> obtenir la confirmation que vos données sont traitées et en recevoir une copie.</p>
                <p><strong>Droit de rectification :</strong> corriger des données inexactes ou incomplètes.</p>
                <p><strong>Droit à l'effacement :</strong> demander la suppression de vos données (« droit à l'oubli »).</p>
                <p><strong>Droit à la limitation :</strong> demander la limitation du traitement dans certains cas.</p>
                <p><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré et couramment utilisé.</p>
                <p><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données pour des motifs légitimes.</p>
                <p><strong>Droit de retrait du consentement :</strong> retirer votre consentement à tout moment (sans remettre en cause la licéité du traitement antérieur).</p>
              </div>
              <p className="mt-3">
                Pour exercer ces droits, adressez votre demande à : <strong>christophe@comunecom.fr</strong>
              </p>
              <p>
                Nous nous engageons à répondre dans un délai d'un mois. En cas de difficulté, vous pouvez adresser une réclamation à la CNIL : www.cnil.fr.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              Le site ExtraTaff utilise uniquement des cookies strictement nécessaires au fonctionnement du service :
            </p>
            <div className="mt-3 space-y-2 text-gray-700 pl-4">
              <p>— <strong>Cookies d'authentification :</strong> permettent de maintenir votre session de connexion.</p>
              <p>— <strong>Cookies de préférences :</strong> mémorisent vos choix d'interface.</p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-3">
              Aucun cookie publicitaire, de traçage ou de profilage n'est utilisé sur ExtraTaff. Aucune donnée n'est partagée avec des régies publicitaires.
            </p>
          </section>

          {/* Sécurité */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Sécurité des données</h2>
            <p className="text-gray-700 leading-relaxed">
              CVBN CONSULTING met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre la destruction, la perte, l'altération, la divulgation ou l'accès non autorisé :
            </p>
            <div className="mt-3 space-y-2 text-gray-700 pl-4">
              <p>— Chiffrement des communications (HTTPS / TLS)</p>
              <p>— Authentification sécurisée via Supabase Auth</p>
              <p>— Contrôle d'accès par rôle (Row Level Security)</p>
              <p>— Données de paiement traitées exclusivement par Stripe (certifié PCI-DSS)</p>
              <p>— Localisation « floue » des utilisateurs (département et ville uniquement, pas d'adresse exacte)</p>
            </div>
          </section>

          {/* Modification */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Modification de la politique</h2>
            <p className="text-gray-700 leading-relaxed">
              CVBN CONSULTING se réserve le droit de modifier la présente politique de confidentialité à tout moment. En cas de modification substantielle, les utilisateurs seront informés par email ou notification. La date de dernière mise à jour est indiquée en haut de ce document.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">12. Contact</h2>
            <div className="bg-gray-50 rounded-lg p-5 text-gray-700">
              <p>Pour toute question relative à vos données personnelles :</p>
              <p className="mt-2"><strong>CVBN CONSULTING</strong> — ExtraTaff</p>
              <p>1, sente aux Pruniers — 27120 Gadencourt</p>
              <p>Email : christophe@comunecom.fr</p>
            </div>
            <p className="text-gray-600 text-sm mt-3">
              Autorité de contrôle : Commission Nationale de l'Informatique et des Libertés (CNIL) — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 — www.cnil.fr
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Confidentialite;
