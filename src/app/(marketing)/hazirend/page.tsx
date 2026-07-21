import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Házirend | Viki Vendégház Szilvásvárad",
  description:
    "A Viki Vendégház házirendje és a szálláshelyen igénybe vehető szolgáltatások.",
};

const prose =
  "[&_h2]:font-semibold [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:text-[var(--text)] " +
  "[&_h3]:font-semibold [&_h3]:text-base [&_h3]:mt-6 [&_h3]:text-[var(--text)] " +
  "[&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-2";

export default function HazirendPage() {
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Jogi</p>
          <h1 className="text-4xl text-white font-light">Házirend</h1>
          <p className="text-[var(--nav-text)]/70 mt-3">Szilvásvárad</p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className={`mx-auto max-w-3xl text-[var(--text)]/75 leading-relaxed ${prose}`}>
          <p>
            Házirendünk célja, hogy Vendégeinknek nyugodt, kellemes pihenést biztosítsunk, valamint
            elkerüljük az esetleges félreértéseket.
          </p>
          <p>
            <strong>Elérhetőség:</strong> Kiss Józsefné ·{" "}
            <a
              href="tel:+36704108282"
              className="text-[var(--accent)] underline underline-offset-2"
            >
              +36 70 410-8282
            </a>
          </p>

          <h2>Házirendi pontok</h2>
          <ol>
            <li>
              Vendégházunkat az érkezés napján 15:00 órától lehet elfoglalni. A kijelentkezés napján
              10:00 óráig kérjük elhagyni a szálláshelyet.
            </li>
            <li>
              Vendégházunkat a vendégek tisztán kapják és ottlétük alatt maguk gondoskodnak a
              tisztaságról. Kérjük Vendégeinket, hogy őrizzék meg a ház épségét.
            </li>
            <li>
              Egy hétnél hosszabb tartózkodás esetén a takarítás hetente történik ágynemű és
              törölköző cserével.
            </li>
            <li>
              Napi takarítás igényelhető, amelyet személyesen vagy a 06 70 410-8282-es telefonszámon
              jelezhet.
            </li>
            <li>A fürdődézsa illetve a szaunák használata előtt zuhanyzás ajánlatos.</li>
            <li>
              Felhívjuk Vendégeink figyelmét, hogy a szobákban dohányozni TILOS! Kérjük, hogy a ház
              teraszán vagy az udvarban dohányozzanak. A cigaretta csikkeket a hamutartókba
              szíveskedjenek kidobni.
            </li>
            <li>
              Ha a ház helyiségeiben található szemetesek esetleg megtelnének itt tartózkodásuk
              idején, kérjük, ürítsék ki a kapuknál található nagy szemetesbe.
            </li>
            <li>
              Napközben, ha elhagyják a vendégházunk területét, kérjük, az ablakokat és az ajtókat
              szíveskedjenek bezárni. Ez az esetleges esőzések során befolyó víz elkerülése végett
              szükséges, illetve hogy illetéktelen személyek ne juthassanak be.
            </li>
            <li>
              Szíveskedjenek az autókkal a kijelölt helyeken úgy parkolni, hogy másokat ne
              korlátozzanak a szabad mozgásban, parkolásban. Az udvari parkolóban elhelyezett
              gépkocsik esetlegesen bekövetkezett káráért felelősséget nem vállalunk!
            </li>
            <li>
              A csendrendeletre való tekintettel megkérjük Vendégeinket, hogy 22 óra után ne
              hangoskodjanak. Az esti órákban a kertben kerülni szíveskedjenek az esetleges hangos,
              zavaró tevékenységeket.
            </li>
            <li>
              Kérjük, távozáskor és éjszakára a házak bejáratát szíveskedjenek kulcsra zárni!
            </li>
            <li>A Vendégházakban elhelyezett értéktárgyakért felelősséget nem vállalunk!</li>
            <li>
              Mint minden háztartásban, a Vendégházainkban is előfordulhat, hogy valami a Vendégek
              hibáján kívül meghibásodik vagy tönkremegy. Szívesen vesszük, ha jelzik az esetleges
              meghibásodásokat, hogy mielőbb kijavíthassuk és az esetleges komoly károkat
              megelőzhessük.
            </li>
            <li>Vendégeink által keletkezett károk rendezése a helyszínen történik.</li>
            <li>Vendégházunk kutyát, macskát, kisállatot nem fogad.</li>
          </ol>
          <p>
            De a Viki Vendégház nem csak kér, hanem ad is! Ha bármire szükségük van, bizalommal
            forduljon hozzánk! Kellemes pihenést kívánunk!
          </p>

          <h2>Ingyenes szolgáltatások</h2>
          <ul>
            <li>Wifi / Internet</li>
            <li>LED TV</li>
            <li>Udvar használata (játszótéri eszközök, grill, bogrács)</li>
            <li>Zárt parkoló</li>
            <li>Kültéri fa medence (tavasztól őszig)</li>
            <li>Sóbarlang használata első 45 percig naponta, szállóvendégeink részére</li>
            <li>
              A vendégház szerződésben áll éttermekkel, ahol 10%-os kedvezményt kaphatnak.
            </li>
          </ul>

          <h2>Fizetős szolgáltatások</h2>
          <ul>
            <li>Fürdődézsa: téli / nyári időszakban a felfűtési díj napi 7 000 Ft.</li>
            <li>Finn szauna: 1 óra / 1 500 Ft/fő.</li>
            <li>
              Infraszauna: (a Superior szoba igénybevevői, vagy a teljes vendégház lefoglalása
              esetén) 1 óra / 1 000 Ft/fő.
            </li>
          </ul>

          <h3>Sóbarlang – áraink</h3>
          <p>
            Szállóvendégeink részére: 45 perc/nap ingyenes, további használat esetén a lenti árak
            érvényesülnek.
          </p>
          <p className="font-medium text-[var(--text)]">Minden további 45 perc:</p>
          <ul>
            <li>Felnőtt: 1 250 Ft</li>
            <li>Gyermek 2 éves korig: ingyenes</li>
            <li>Diák (18 évesig), nyugdíjas: 950 Ft</li>
            <li>Gyermek + kísérő felnőtt: 1 500 Ft</li>
            <li>2 gyermek + 1 felnőtt: 2 000 Ft</li>
            <li>Családi belépő (2 felnőtt + 2 gyermek): 2 600 Ft</li>
            <li>Gyerek kiegészítő jegy (2–10 éves): 500 Ft</li>
          </ul>
          <p className="font-medium text-[var(--text)]">Bérletek — 10 alkalmas (8 hétig érvényes):</p>
          <ul>
            <li>Felnőtt: 11 500 Ft</li>
            <li>Diák/nyugdíjas: 9 500 Ft</li>
            <li>1 gyermek + 1 felnőtt: 15 000 Ft</li>
            <li>2 gyermek + 1 felnőtt: 17 500 Ft</li>
            <li>Családi belépő (2 gyermek + 2 felnőtt): 22 000 Ft</li>
          </ul>

          <div className="mt-10 pt-6 border-t border-[var(--border)] text-sm text-[var(--text)]/60 space-y-1">
            <p className="font-medium text-[var(--text)]/80">Viki Vendégház</p>
            <p>3348 Szilvásvárad, Dózsa György utca 45.</p>
            <p>
              <a
                href="https://www.vikivendeghaz.hu"
                className="text-[var(--accent)] underline underline-offset-2"
              >
                www.vikivendeghaz.hu
              </a>
            </p>
            <p>NTAK: MA22031772 · Adószám: 52477937-1-30</p>
            <p>Kiss Józsefné · +36 70 410-8282 · vikivendeghaz@gmail.com</p>
          </div>
        </div>
      </section>
    </div>
  );
}
