import { Bell, CheckCircle, Clock, Euro, ShieldCheck } from 'lucide-react';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface Plan {
    name: string;
    price: number;
    popular: boolean;
    contracts: number;
    features: string[];
}

interface Feature {
    icon: React.ElementType;
    title: string;
    description: string;
}

interface Testimonial {
    name: string;
    role: string;
    content: string;
    avatar: string;
}

export default function Landing() {
    const [selectedPlan, setSelectedPlan] = useState<string>('pro');

    const features: Feature[] = [
        {
            icon: Bell,
            title: 'Alertes Automatiques',
            description: 'Recevez des notifications 3 mois, 1 mois et 1 semaine avant chaque échéance de contrat',
        },
        {
            icon: ShieldCheck,
            title: 'OCR Intelligent',
            description: 'Notre IA extrait automatiquement les dates et conditions de résiliation de vos contrats PDF',
        },
        {
            icon: Clock,
            title: 'Suivi Centralisé',
            description: 'Tous vos contrats dans un tableau de bord unique avec vue calendaire des échéances',
        },
        {
            icon: Euro,
            title: 'Économies Garanties',
            description: "Évitez les reconductions automatiques non désirées et économisez des milliers d'euros",
        },
    ];

    const testimonials: Testimonial[] = [
        {
            name: 'Marie Dubois',
            role: 'Dirigeante PME',
            content: "J'ai économisé 3 200€ en 6 mois en évitant les reconductions automatiques. Un outil indispensable !",
            avatar: 'MD',
        },
        {
            name: 'Thomas Martin',
            role: 'Freelance',
            content: 'Plus jamais de mauvaise surprise ! Je reçois mes alertes et je peux négocier ou résilier à temps.',
            avatar: 'TM',
        },
        {
            name: 'Sophie Legrand',
            role: 'Responsable Achats',
            content: "Interface intuitive et très efficace. Nos équipes adorent la simplicité d'utilisation.",
            avatar: 'SL',
        },
    ];

    const plans: Plan[] = [
        {
            name: 'Starter',
            price: 19,
            popular: false,
            contracts: 10,
            features: ['10 contrats surveillés', 'Alertes email automatiques', 'OCR intelligent', 'Tableau de bord basique', 'Support email'],
        },
        {
            name: 'Pro',
            price: 49,
            popular: true,
            contracts: 50,
            features: [
                '50 contrats surveillés',
                'Alertes email + SMS',
                'OCR avancé + IA',
                'Analytics détaillés',
                'Support prioritaire',
                'Export données',
                'Intégration calendrier',
            ],
        },
    ];

    return (
        <>
            <Head title="Préavis - Ne ratez plus jamais une résiliation" />

            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-6">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-indigo-600">Préavis</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/login" className="text-gray-500 hover:text-gray-900">
                                Connexion
                            </Link>
                            <Link href="/register" className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
                                Essai Gratuit
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="mb-6 text-4xl font-bold md:text-6xl">Ne ratez plus jamais une résiliation</h1>
                        <p className="mb-8 text-xl text-indigo-100 md:text-2xl">
                            Économisez des milliers d'euros en évitant les reconductions automatiques non désirées
                        </p>
                        <div className="flex flex-col justify-center gap-4 sm:flex-row">
                            <Link
                                href="/register"
                                className="rounded-lg bg-white px-8 py-3 text-lg font-semibold text-indigo-600 transition hover:bg-gray-50"
                            >
                                Commencer Gratuitement
                            </Link>
                            <button className="rounded-lg border-2 border-white px-8 py-3 text-lg font-semibold text-white transition hover:bg-white hover:text-indigo-600">
                                Voir la Démo
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-indigo-200">Essai gratuit 7 jours • Sans engagement • Annulation facile</p>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="bg-gray-50 py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-gray-900">Vous perdez de l'argent chaque mois</h2>
                        <p className="text-xl text-gray-600">94% des entreprises ont déjà subi une reconduction automatique non désirée</p>
                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        <div className="text-center">
                            <div className="mb-2 text-4xl font-bold text-red-500">2 400€</div>
                            <p className="text-gray-600">Coût moyen annuel des oublis de résiliation</p>
                        </div>
                        <div className="text-center">
                            <div className="mb-2 text-4xl font-bold text-red-500">87%</div>
                            <p className="text-gray-600">Des contrats sont reconduits automatiquement</p>
                        </div>
                        <div className="text-center">
                            <div className="mb-2 text-4xl font-bold text-red-500">45 min</div>
                            <p className="text-gray-600">Temps perdu par mois à gérer les contrats</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-gray-900">Une solution simple et automatique</h2>
                        <p className="text-xl text-gray-600">Uploadez vos contrats, notre IA fait le reste</p>
                    </div>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                        {features.map((feature, index) => (
                            <div key={index} className="text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                                    <feature.icon className="h-8 w-8 text-indigo-600" />
                                </div>
                                <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="bg-gray-50 py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-gray-900">Comment ça marche ?</h2>
                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
                                1
                            </div>
                            <h3 className="mb-2 text-lg font-semibold">Uploadez vos contrats</h3>
                            <p className="text-gray-600">Glissez-déposez vos PDF de contrats dans l'interface</p>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
                                2
                            </div>
                            <h3 className="mb-2 text-lg font-semibold">L'IA analyse automatiquement</h3>
                            <p className="text-gray-600">Notre OCR extrait les dates et conditions de résiliation</p>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
                                3
                            </div>
                            <h3 className="mb-2 text-lg font-semibold">Recevez les alertes</h3>
                            <p className="text-gray-600">Notifications automatiques avant chaque échéance</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-gray-900">Ils économisent déjà des milliers d'euros</h2>
                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        {testimonials.map((testimonial, index) => (
                            <div key={index} className="rounded-lg bg-white p-6 shadow-lg">
                                <p className="mb-4 text-gray-600">"{testimonial.content}"</p>
                                <div className="flex items-center">
                                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{testimonial.name}</p>
                                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="bg-gray-50 py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-gray-900">Tarifs simples et transparents</h2>
                        <p className="text-xl text-gray-600">Choisissez le plan qui correspond à vos besoins</p>
                    </div>
                    <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
                        {plans.map((plan, index) => (
                            <div key={index} className={`relative rounded-lg bg-white p-8 shadow-lg ${plan.popular ? 'ring-2 ring-indigo-600' : ''}`}>
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                                        <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">
                                            Le plus populaire
                                        </span>
                                    </div>
                                )}
                                <div className="mb-6 text-center">
                                    <h3 className="mb-2 text-2xl font-bold text-gray-900">{plan.name}</h3>
                                    <div className="mb-2 text-4xl font-bold text-indigo-600">
                                        {plan.price}€<span className="text-lg text-gray-500">/mois</span>
                                    </div>
                                    <p className="text-gray-500">Jusqu'à {plan.contracts} contrats</p>
                                </div>
                                <ul className="mb-8 space-y-3">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center">
                                            <CheckCircle className="mr-3 h-5 w-5 text-green-500" />
                                            <span className="text-gray-600">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/register"
                                    className={`block w-full rounded-lg px-6 py-3 text-center font-semibold transition ${
                                        plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                    }`}
                                >
                                    Commencer l'essai gratuit
                                </Link>
                            </div>
                        ))}
                    </div>
                    <p className="mt-8 text-center text-gray-500">Essai gratuit 7 jours • Sans engagement • Annulation facile</p>
                </div>
            </section>

            {/* CTA Final */}
            <section className="bg-indigo-600 py-16 text-white">
                <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                    <h2 className="mb-4 text-3xl font-bold">Prêt à arrêter de perdre de l'argent ?</h2>
                    <p className="mb-8 text-xl text-indigo-100">Rejoignez les centaines d'entreprises qui économisent déjà des milliers d'euros</p>
                    <Link
                        href="/register"
                        className="inline-block rounded-lg bg-white px-8 py-3 text-lg font-semibold text-indigo-600 transition hover:bg-gray-50"
                    >
                        Commencer Gratuitement
                    </Link>
                    <p className="mt-4 text-sm text-indigo-200">Configuration en moins de 5 minutes</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 py-12 text-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-8 md:grid-cols-4">
                        <div>
                            <h3 className="mb-4 text-lg font-semibold">Préavis</h3>
                            <p className="text-gray-400">
                                La solution intelligente pour gérer vos contrats et éviter les reconductions automatiques.
                            </p>
                        </div>
                        <div>
                            <h4 className="mb-4 font-semibold">Produit</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>
                                    <a href="#" className="hover:text-white">
                                        Fonctionnalités
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white">
                                        Tarifs
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white">
                                        Sécurité
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-4 font-semibold">Support</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>
                                    <a href="#" className="hover:text-white">
                                        Centre d'aide
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white">
                                        Contact
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white">
                                        Status
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-4 font-semibold">Légal</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li>
                                    <a href="#" className="hover:text-white">
                                        CGU
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white">
                                        Confidentialité
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white">
                                        Cookies
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-400">
                        <p>&copy; 2024 Préavis. Tous droits réservés.</p>
                    </div>
                </div>
            </footer>
        </>
    );
} 