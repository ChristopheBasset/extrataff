import { Link } from 'react-router-dom';

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/" className="text-white/80 hover:text-white text-sm mb-4 inline-block">← Retour à l'accueil</Link>
          <h1 className="text-3xl font-bold text-white">Mentions légales</h1>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-10 space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Éditeur du site</h2>
            <p>
              Le site <strong>extrataff.fr</strong> est édité par la société <strong>ExtraTaff SAS</strong> (en cours d'immatriculation).
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              <li><strong>Siège social :</strong> 1, sente aux Pruniers — 27120 Gadencourt</li>
              <li><strong>SIRET :</strong> En cours d'attribution</li>
              <li><strong>Directeur de la publication :</strong> Christophe Basset</li>
              <li><strong>Contact :</strong> <a href="mailto:christophe@comunecom.fr" className="text-blue-600 hover:underline">christophe@comunecom.fr</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Hébergement</h2>
            <p>Le site est hébergé par :</p>
            <ul className="mt-3 space-y-1 text-sm">
              <li><strong>Site web :</strong> Netlify, Inc. — 44 Montgomery Street, Suite 300, San Francisco, CA 94104, États-Unis</li>
              <li><strong>Base de données :</strong> Supabase, Inc. — 970 Toa Payoh North, #07-04, Singapore 318992</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu du site ExtraTaff (textes, images, logos, icônes, interface, code source) est la propriété exclusive d'ExtraTaff SAS ou de ses partenaires. Toute reproduction, représentation, modification ou exploitation, totale ou partielle, de ces contenus, par quelque procédé que ce soit, sans l'autorisation préalable et écrite d'ExtraTaff SAS, est strictement interdite et constitue une contrefaçon sanctionnée par le Code de la propriété intellectuelle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Responsabilité</h2>
            <p>
              ExtraTaff SAS met tout en œuvre pour assurer l'exactitude et la mise à jour des informations diffusées sur le site. Toutefois, ExtraTaff SAS ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition sur ce site. ExtraTaff SAS décline toute responsabilité pour tout dommage résultant d'une intrusion frauduleuse d'un tiers ayant entraîné une modification des informations mises à la disposition sur le site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Liens hypertextes</h2>
            <p>
              Le site ExtraTaff peut contenir des liens vers d'autres sites internet. ExtraTaff SAS ne peut être tenue responsable du contenu de ces sites externes ni des éventuels dommages liés à leur utilisation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, et après une tentative de résolution amiable, compétence est attribuée aux tribunaux français compétents.
            </p>
          </section>

        </div>

        <p className="text-center text-gray-400 text-xs mt-8">Dernière mise à jour : février 2026</p>
      </div>
    </div>
  );
}
