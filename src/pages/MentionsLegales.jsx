import { Link } from 'react-router-dom';

const MentionsLegales = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/" className="text-blue-200 hover:text-white text-sm mb-4 inline-block">
            ← Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-bold">Mentions Légales</h1>
          <p className="text-blue-200 mt-2">Dernière mise à jour : 24 février 2026</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">

          {/* Éditeur */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Éditeur du site</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-2 text-gray-700">
              <p>Le site <strong>ExtraTaff</strong> (accessible à l'adresse https://extrataff.fr) est édité par :</p>
              <div className="mt-3 space-y-2">
                <p><strong>Raison sociale :</strong> CVBN CONSULTING</p>
                <p><strong>Nom commercial :</strong> ExtraTaff</p>
                <p><strong>Forme juridique :</strong> SASU — Société par Actions Simplifiée Unipersonnelle</p>
                <p><strong>Capital social :</strong> 500,00 €</p>
                <p><strong>Siège social :</strong> 1, sente aux Pruniers — 27120 Gadencourt</p>
                <p><strong>SIREN :</strong> 984 685 933</p>
                <p><strong>SIRET (siège) :</strong> 984 685 933 00017</p>
                <p><strong>Numéro de TVA intracommunautaire :</strong> FR23984685933</p>
                <p><strong>RCS :</strong> 984 685 933 R.C.S. Evreux (inscrit le 20/02/2024)</p>
                <p><strong>Inscription au RNE :</strong> Inscrit</p>
                <p><strong>Directeur de la publication :</strong> Christophe Basset, Président</p>
                <p><strong>Email :</strong> christophe@comunecom.fr</p>
              </div>
            </div>
          </section>

          {/* Hébergement */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Hébergement</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <p><strong>Site web :</strong> Netlify, Inc.</p>
                <p className="text-sm text-gray-500">512 2nd Street, Suite 200 — San Francisco, CA 94107, États-Unis</p>
                <p className="text-sm text-gray-500">https://www.netlify.com</p>
              </div>
              <div>
                <p><strong>Base de données et authentification :</strong> Supabase, Inc.</p>
                <p className="text-sm text-gray-500">970 Toa Payoh North #07-04, Singapore 318992</p>
                <p className="text-sm text-gray-500">https://supabase.com</p>
              </div>
              <div>
                <p><strong>Notifications email et SMS :</strong> Brevo (ex-Sendinblue)</p>
                <p className="text-sm text-gray-500">106 boulevard Haussmann — 75008 Paris, France</p>
                <p className="text-sm text-gray-500">https://www.brevo.com</p>
              </div>
              <div>
                <p><strong>Paiement sécurisé :</strong> Stripe, Inc.</p>
                <p className="text-sm text-gray-500">354 Oyster Point Blvd — South San Francisco, CA 94080, États-Unis</p>
                <p className="text-sm text-gray-500">https://stripe.com</p>
              </div>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Propriété intellectuelle</h2>
            <p className="text-gray-700 leading-relaxed">
              L'ensemble du contenu du site ExtraTaff (textes, images, graphismes, logo, icônes, logiciels, base de données) est la propriété exclusive de CVBN CONSULTING ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sauf autorisation écrite préalable de CVBN CONSULTING.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              La marque ExtraTaff, le logo et le slogan « L'extra qu'il te faut » sont la propriété de CVBN CONSULTING. Toute utilisation non autorisée constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
            </p>
          </section>

          {/* Responsabilité */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Limitation de responsabilité</h2>
            <p className="text-gray-700 leading-relaxed">
              CVBN CONSULTING s'efforce de fournir sur le site ExtraTaff des informations aussi précises que possible. Toutefois, elle ne pourra être tenue responsable des omissions, des inexactitudes et des carences dans la mise à jour, qu'elles soient de son fait ou du fait des tiers partenaires qui lui fournissent ces informations.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              ExtraTaff est une plateforme de mise en relation entre établissements et travailleurs temporaires (extras) dans le secteur de l'hôtellerie-restauration. CVBN CONSULTING n'est pas partie aux contrats de travail conclus entre les établissements et les extras et ne saurait être tenue responsable des manquements de l'une ou l'autre des parties.
            </p>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Données personnelles</h2>
            <p className="text-gray-700 leading-relaxed">
              Les informations relatives au traitement des données personnelles sont détaillées dans notre{' '}
              <Link to="/confidentialite" className="text-blue-600 hover:underline">
                Politique de confidentialité
              </Link>.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous à : christophe@comunecom.fr
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              Le site ExtraTaff utilise des cookies strictement nécessaires au fonctionnement du service (authentification, session utilisateur). Aucun cookie publicitaire ou de traçage n'est utilisé.
            </p>
          </section>

          {/* Droit applicable */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Droit applicable et juridiction</h2>
            <p className="text-gray-700 leading-relaxed">
              Les présentes mentions légales sont régies par le droit français. En cas de litige, et après tentative de résolution amiable, compétence est attribuée aux tribunaux compétents d'Évreux, nonobstant pluralité de défendeurs ou appel en garantie.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default MentionsLegales;
