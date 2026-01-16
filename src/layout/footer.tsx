import { Link } from "@/components/catalyst/link";
import { Copyright } from "@/components/copyright";

const navigation = {
  szolgaltatasok: [
    { name: "Weboldal Fejlesztés", href: "/szolgaltatasok/weboldal" },
    { name: "Egyedi Szoftver", href: "/szolgaltatasok/szoftver" },
    { name: "SEO & Marketing", href: "/szolgaltatasok/seo" },
    { name: "Karbantartás", href: "/szolgaltatasok/karbantartas" },
  ],
  ceg: [
    { name: "Rólunk", href: "/rolunk" },
    { name: "Blog", href: "/blog" },
    { name: "Karrier", href: "/karrier" },
    { name: "Kapcsolat", href: "/kapcsolat" },
  ],
  jogi: [
    { name: "Adatkezelési Tájékoztató", href: "/adatkezeles" },
    { name: "ÁSZF", href: "/aszf" },
    { name: "Süti Szabályzat", href: "/sutik" },
  ],
  social: [
    {
      name: "Facebook",
      href: "#",
      icon: (props: React.ComponentProps<"svg">) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: "#",
      icon: (props: React.ComponentProps<"svg">) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path
            fillRule="evenodd"
            d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ],
};

export function Footer() {
  return (
    <footer
      className="bg-slate-50 border-t border-slate-200"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Lábléc
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            {/* LOGÓ HELYE */}
            <div className="flex items-center gap-2 font-display font-bold text-xl text-slate-900">
              <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-sans">
                B
              </div>
              BlueNet
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Prémium digitális megoldások tudatos cégvezetőknek. <br />A jövő
              weboldalai, ma.
            </p>
            <div className="flex space-x-6">
              {navigation.social.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-slate-400 hover:text-slate-500"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-slate-900">
                  Szolgáltatások
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.szolgaltatasok.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-slate-600 hover:text-slate-900"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-slate-900">
                  Cég
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.ceg.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-slate-600 hover:text-slate-900"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-slate-900">
                  Jogi
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.jogi.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-slate-600 hover:text-slate-900"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-slate-900/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-slate-500">
            &copy; <Copyright /> BlueNet Solutions. Minden jog fenntartva.
          </p>
        </div>
      </div>
    </footer>
  );
}
