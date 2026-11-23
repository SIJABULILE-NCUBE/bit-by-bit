import { Link } from 'react-router-dom'

// the 3 selling points I want people to see straight away
const points = [
  { icon: '0%', title: 'No interest, ever', text: 'The price on the tag is all you pay.' },
  { icon: '✓', title: 'No credit checks, no debt', text: 'You take it home once it is paid off.' },
  { icon: '🧾', title: 'Proof for every payment', text: 'See your balance and due dates any time.' },
]

// landing page, based on my "1. Landing Page" Stitch screen
function Landing() {
  return (
    <main className="min-h-screen">
      {/* top bar with the logo */}
      <header className="flex items-center justify-between px-5 py-4 max-w-5xl mx-auto">
        <span className="text-xl font-bold text-brand">
          Bit by Bit <span aria-hidden>🛍️</span>
        </span>
        <Link to="/login" className="text-sm font-semibold text-brand hover:underline">
          Log in
        </Link>
      </header>

      {/* hero section */}
      <section className="px-5 pt-8 pb-12 max-w-5xl mx-auto md:grid md:grid-cols-2 md:gap-10 md:items-center">
        <div>
          <p className="inline-block rounded-full bg-gold-light text-brand-dark text-xs font-semibold px-3 py-1">
            Lay-by made simple for SA shops
          </p>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight text-brand">
            Own it <span className="text-gold">bit by bit.</span>
          </h1>
          <p className="mt-4 text-gray-600 text-lg">
            Pay off the things you need in small instalments, with no interest and no debt.
            Shops always know who has paid what.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-brand text-white font-semibold text-center px-6 py-3 hover:bg-brand-dark"
            >
              Get started
            </Link>
            <Link
              to="/login"
              className="rounded-xl border-2 border-brand text-brand font-semibold text-center px-6 py-3 hover:bg-brand-light"
            >
              I already have an account
            </Link>
          </div>
        </div>

        {/* little example card so people "get it" quickly */}
        <div className="mt-10 md:mt-0 rounded-2xl bg-white shadow-md p-5">
          <p className="text-sm text-gray-500">Kasi Kids Wear</p>
          <p className="font-semibold">School blazer + 2 shirts</p>
          <div className="mt-4 h-3 rounded-full bg-gray-200">
            <div className="h-3 rounded-full bg-gold" style={{ width: '60%' }} />
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span>Paid R 540,00</span>
            <span className="font-semibold text-brand">60%</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Next payment: R 180,00 on 30 Nov</p>
        </div>
      </section>

      {/* why bit by bit */}
      <section className="px-5 pb-16 max-w-5xl mx-auto grid gap-4 md:grid-cols-3">
        {points.map((p) => (
          <div key={p.title} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="h-10 w-10 rounded-full bg-brand-light text-brand font-bold flex items-center justify-center">
              {p.icon}
            </div>
            <h2 className="mt-3 font-semibold">{p.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{p.text}</p>
          </div>
        ))}
      </section>
    </main>
  )
}

export default Landing
