import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Általános Szerződési Feltételek (ÁSZF) | Viki Vendégház",
  description:
    "A Viki Vendégház szálláshely-szolgáltatásának általános szerződési feltételei.",
};

const prose =
  "[&_h2]:font-semibold [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:text-[var(--text)] " +
  "[&_h3]:font-semibold [&_h3]:text-base [&_h3]:mt-6 [&_h3]:text-[var(--text)] " +
  "[&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1 " +
  "[&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2";

export default function AszfPage() {
  return (
    <div className="pt-16 bg-[var(--bg)] min-h-screen">
      <section className="bg-[var(--nav-bg)] py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-[var(--accent2)] mb-4">Jogi</p>
          <h1 className="text-4xl text-white font-light">Általános Szerződési Feltételek (ÁSZF)</h1>
          <p className="text-[var(--nav-text)]/70 mt-3">
            Szálláshely-szolgáltatás igénybevételének általános feltételei
          </p>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className={`mx-auto max-w-3xl text-[var(--text)]/75 leading-relaxed ${prose}`}>
          <h2>1. A Szolgáltató adatai</h2>
          <p>
            A jelen Általános Szerződési Feltételek (a továbbiakban: ÁSZF) a Viki Vendégház
            szálláshely-szolgáltatásának igénybevételére vonatkozó feltételeket tartalmazzák a
            Szolgáltató és a Vendég között létrejövő szerződés keretében.
          </p>
          <ul>
            <li>Szolgáltató neve: Kiss Józsefné</li>
            <li>Jogállás: adószámmal rendelkező magánszemély (magánszálláshely-szolgáltató)</li>
            <li>Székhely: 3348 Szilvásvárad, Dózsa György utca 45.</li>
            <li>A szálláshely címe: 3348 Szilvásvárad, Dózsa György utca 45.</li>
            <li>Adószám: 52477937-1-30</li>
            <li>NTAK regisztrációs szám: MA22031772</li>
            <li>Telefon: 06 70 410-8282</li>
            <li>E-mail: vikivendeghaz@gmail.com</li>
            <li>
              Weboldal: <a href="https://www.vikivendeghaz.hu">www.vikivendeghaz.hu</a>
            </li>
          </ul>

          <h2>2. Az ÁSZF hatálya és fogalmak</h2>
          <p>
            A jelen ÁSZF határozatlan időre szól, és a Szolgáltató által nyújtott
            szálláshely-szolgáltatásra, valamint az ahhoz kapcsolódó kiegészítő (wellness)
            szolgáltatásokra terjed ki. Az ÁSZF a Szolgáltató weboldalán folyamatosan elérhető, és
            a foglalás leadásával a Vendég azt magára nézve kötelezőnek fogadja el.
          </p>
          <p>
            <strong>Foglaló (Szerződéses fél):</strong> az a nagykorú, cselekvőképes természetes
            vagy jogi személy, aki a szálláshelyet lefoglalja. A foglalást leadó személy minden
            esetben a Szolgáltatóval szerződő fél, függetlenül attól, hogy hány fő és kik veszik
            ténylegesen igénybe a szolgáltatást. A vendégcsoport tagjai nevében a foglaló jár el.
          </p>
          <p>
            <strong>Vendég:</strong> a szálláshelyet ténylegesen igénybe vevő személy(ek),
            beleértve a foglalót is.
          </p>
          <p>
            <strong>Szolgáltatás:</strong> a szálláshely és tartozékainak, valamint az igénybe vett
            kiegészítő (wellness) szolgáltatásoknak a rendelkezésre bocsátása.
          </p>

          <h2>3. A szerződés tárgya és a szálláshely</h2>
          <p>
            A Szolgáltató a Viki Vendégházban legfeljebb 12 fő részére nyújt
            szálláshely-szolgáltatást, családias, természetközeli környezetben. A szálláshely
            három, saját fürdőszobával rendelkező, külön bejáratú szobából (Komfort Kétágyas – max.
            3 fő; Komfort Franciaágyas – max. 3 fő; Superior – max. 4 fő), valamint a közös
            nappaliban elhelyezhető további legfeljebb 2 főből áll. A szálláshely és tartozékai
            kizárólag a szállóvendégek részére állnak rendelkezésre.
          </p>
          <p>
            A szálláshelyhez az alábbi szolgáltatások, illetve létesítmények tartoznak (a
            mindenkori foglalási feltételek szerint):
          </p>
          <ul>
            <li>három, saját fürdőszobás vendégszoba, közös konyha, étkező és nappali;</li>
            <li>kültéri, fa vázas medence, fürdődézsa;</li>
            <li>finn szauna, infraszauna, sóbarlang;</li>
            <li>kerthelyiség, napozóágyak, grillezési lehetőség, zárt parkoló.</li>
          </ul>
          <p>
            A wellness szolgáltatások igénybevétele az adott szolgáltatásra vonatkozó külön
            használati szabályzatok, valamint a Házirend szerint történik. Ezek a dokumentumok a
            jelen ÁSZF elválaszthatatlan mellékleteit képezik, és a szálláshelyen, illetve a
            weboldalon elérhetők.
          </p>

          <h2>4. A foglalás menete és a szerződés létrejötte</h2>
          <p>
            A Vendég a foglalási igényét e-mailben, telefonon vagy a weboldalon keresztül
            jelezheti. A Szolgáltató a foglalási igényt visszaigazolja, és tájékoztatást ad a
            szabad időpontokról, az árakról, valamint az előleg megfizetésének feltételeiről.
          </p>
          <p>
            A szerződés a foglalás Szolgáltató általi írásbeli visszaigazolásával és a foglalási
            díj (előleg) megfizetésével jön létre. A Szolgáltató a szerződéses jogviszony fennállása
            alatt minden esetben kizárólag a foglalóval tart kapcsolatot: a foglaló a szerződéses
            fél, aki egyedül jogosult és köteles a foglalással kapcsolatos valamennyi nyilatkozat
            (megerősítés, módosítás, lemondás, panasz) megtételére, továbbá kizárólag ő jogosult a
            felmerülő vitás kérdések rendezésére a Szolgáltatóval szemben. A Szolgáltató a
            vendégcsoport többi tagjától érkező kérést, nyilatkozatot nem köteles elfogadni.
          </p>

          <h3>4.1. Szezon, egész házas értékesítés és szezonon kívüli foglalás</h3>
          <p>
            Főszezonnak minősül a június 1. – augusztus 31. közötti időszak. Főszezonban a foglalás
            kizárólag a teljes vendégházra vonatkozik; a szálláshely ebben az időszakban szobánként
            külön nem foglalható.
          </p>
          <p>
            Szezonon kívül a szálláshely – a Szolgáltatóval történő külön megegyezés alapján –
            szobánként is foglalható. Amennyiben azonban szezonon kívül is a teljes vendégház kerül
            lefoglalásra, arra a főszezoni, egész házas foglalásra vonatkozó feltételek (jelen 4.1.
            pont és az 5.1. pont) az irányadók.
          </p>

          <h3>4.2. Az egész házas foglalás díja és a csoporton belüli kockázat viselése</h3>
          <p>
            Egész házas foglalás esetén a vendégház egységként kerül értékesítésre. A szolgáltatás
            díja az egész házra megállapított díj, amely független a ténylegesen megérkező vendégek
            számától: akár 1 fő, akár a legfeljebb 12 fő veszi igénybe a szálláshelyet, a fizetendő
            díj azonos. A Szolgáltatót minden esetben a teljes, egész házra vonatkozó díj illeti meg.
          </p>
          <p>
            Amennyiben a vendégcsoport bármely tagja nem érkezik meg, vagy a részvételét lemondja,
            az kizárólag a foglaló és az érintett vendég közötti belső jogviszonynak minősül. A
            Szolgáltató ilyen esetben felelősséget nem vállal, a szolgáltatás díját teljes
            összegében megilleti, és sem rész-, sem teljes visszatérítésre nem köteles. A foglaló –
            mint szerződéses fél – viseli a csoporton belüli valamennyi ilyen kockázatot, és őt
            terheli a csoport tagjaival való elszámolás.
          </p>

          <h2>5. Árak, díjak és fizetési feltételek</h2>
          <h3>5.1. Egész házas ár</h3>
          <p>
            Egész házas foglalás esetén a szálláshely-szolgáltatás díja az egész házra
            megállapított, a foglalás visszaigazolásában rögzített díj. A díj a ténylegesen érkező
            vendégek számától független (lásd 4.2. pont). A mindenkori árak szezontól és naptípustól
            (hétköznap/hétvége) függően változhatnak.
          </p>
          <h3>5.2. Foglalási díj (előleg) és fizetés</h3>
          <ul>
            <li>
              <strong>Foglalási díj (előleg):</strong> a szolgáltatás díjának 10%-a, amelyet a
              Vendég a foglalás Szolgáltató általi visszaigazolásától számított 3 naptári napon
              belül, banki átutalással köteles megfizetni.
            </li>
            <li>
              <strong>A foglalás érvényessége:</strong> amennyiben a foglalási díj a fenti 3 napos
              határidőn belül nem érkezik meg a Szolgáltatóhoz, a foglalás automatikusan érvényét
              veszti, és a Szolgáltató az időpontot szabadon értékesítheti.
            </li>
            <li>
              <strong>Fennmaradó összeg:</strong> a szolgáltatás díjának fennmaradó része a
              megérkezéskor vagy a távozáskor fizetendő.
            </li>
            <li>
              <strong>Fizetési módok:</strong> készpénz, banki átutalás, valamint SZÉP-kártya.
            </li>
            <li>
              <strong>Idegenforgalmi adó:</strong> 600 Ft/fő/éj, amely a szolgáltatás díján felül, a
              helyszínen fizetendő.
            </li>
            <li>
              <strong>Kaució:</strong> a Szolgáltató jogosult kauciót kérni, amelynek összegét
              egyedileg, a foglalás körülményei alapján állapítja meg. A kauciót a Szolgáltató a
              szálláshely rendeltetésszerű, kár nélküli visszaadása esetén a távozáskor visszatéríti.
            </li>
          </ul>

          <h2>6. Lemondás, elállás és módosítás</h2>
          <p>
            A Vendég a foglalást írásban (e-mailben) mondhatja le. A lemondás időpontja alapján a
            következő feltételek irányadók, a megfizetett foglalási díjra (előlegre) vetítve:
          </p>
          <ul>
            <li>
              Az érkezést megelőző 30. napig (bezárólag): díjmentes lemondás, a foglalási díj teljes
              összegében visszajár.
            </li>
            <li>
              Az érkezést megelőző 30. napon belül, a 15. napig: a foglalási díj 50%-a kötbérként a
              Szolgáltatót illeti, a fennmaradó rész visszajár.
            </li>
            <li>
              Az érkezést megelőző 15 napon belül, illetve meg nem jelenés (no-show) esetén: a
              teljes foglalási díj a Szolgáltatót illeti, az nem jár vissza.
            </li>
          </ul>
          <p>
            Egész házas foglalás esetén a fenti lemondási feltételek a teljes foglalásra
            vonatkoznak. A csoport egyes tagjainak meg nem jelenése vagy visszalépése nem minősül a
            foglalás lemondásának, és nem keletkeztet visszatérítési igényt (lásd 4.2. pont).
          </p>
          <p>
            A foglalás módosítására (időpont, létszám) a Szolgáltató beleegyezésével, a szabad
            kapacitás függvényében van lehetőség. Minden lemondási és módosítási nyilatkozatot a
            foglaló (szerződéses fél) jogosult megtenni.
          </p>
          <p>
            Amennyiben a Vendég a foglalási díjat (előleget), illetve a szolgáltatás díját előre,
            banki átutalással megfizette, az előre megfizetett összegre a jelen 6. pont lemondási és
            visszatérítési szabályai ugyanúgy irányadók: a lemondás időpontjától függően a
            megfizetett összeg részben vagy egészben visszajár, illetve nem jár vissza. Az előre
            történő fizetés tehát nem keletkeztet a fentiektől eltérő, kedvezőbb visszatérítési
            igényt.
          </p>
          <p>
            A Szolgáltató jogosult a szerződéstől elállni, ha a foglaláskor megadott adatok
            valótlanok, a foglalási díjat a Vendég határidőben nem fizeti meg, illetve vis maior
            (pl. elemi kár, hatósági intézkedés) esetén. Ez utóbbi esetben a Szolgáltató a már
            megfizetett díjat visszatéríti, egyéb kártérítési kötelezettség nélkül.
          </p>

          <h2>7. Bejelentkezés és kijelentkezés</h2>
          <ul>
            <li>Bejelentkezés (check-in): 15:00 órától.</li>
            <li>Kijelentkezés (check-out): 10:00 óráig.</li>
          </ul>
          <p>
            <strong>Késői kijelentkezés (late check-out):</strong> amennyiben a Vendég a távozás
            napján 10:00 óra után is a szálláshelyen kíván maradni, arra minden esetben kizárólag a
            vendégház tulajdonosával (üzemeltetőjével) történő előzetes megegyezés alapján van
            lehetőség. A tulajdonos a többletidőért díjat számíthat fel. A megegyezés minden esetben
            a foglalóval (szerződéses féllel) történik, és a többletdíj megfizetéséért a foglaló
            felel.
          </p>
          <p>
            Ettől eltérő időpontban történő érkezésre vagy távozásra a Szolgáltatóval történő
            előzetes egyeztetés alapján van lehetőség. Bejelentkezéskor a Vendég a jogszabályban
            előírt módon köteles személyazonosságát igazolni (vendégadat-rögzítés).
          </p>

          <h2>8. Házirend és a szálláshely rendeltetésszerű használata</h2>
          <p>
            A szálláshely és a wellness szolgáltatások igénybevétele a hatályos Házirend, valamint
            az egyes szolgáltatásokra vonatkozó külön Használati Szabályzatok szerint történik. A
            Házirend a jelen ÁSZF önálló, de attól elválaszthatatlan dokumentuma, amely a
            szálláshelyen és a weboldalon elérhető. A foglalás leadásával a Vendég a Házirendet és a
            Használati Szabályzatokat megismertnek és elfogadottnak tekinti.
          </p>
          <p>
            A Vendég köteles a szálláshelyet és berendezéseit rendeltetésszerűen, a jó gazda
            gondosságával használni. A 14 év alatti gyermekek a wellness szolgáltatásokat kizárólag
            felnőtt felügyeletével vehetik igénybe.
          </p>

          <h2>9. A Vendég felelőssége és kártérítés</h2>
          <p>
            A foglaló (szerződéses fél) felel a vendégcsoport valamennyi tagjának magatartásáért,
            valamint az általuk a szálláshelyben, annak berendezéseiben vagy felszerelésében okozott
            károkért. A Szolgáltató a bekövetkezett kárt dokumentálja, és annak megtérítését a
            foglalótól – lehetőség szerint még a távozás előtt – igényelheti.
          </p>
          <p>
            A kültéri fa medence nem rendeltetésszerű használatából (pl. beleugrálás, kilocsolás,
            túlzott fröcskölés) eredő, nem természetes vízszintcsökkenés esetén a szükséges
            vízutánpótlás költsége a Vendéget terheli, az adott Használati Szabályzatban foglaltak
            szerint. E költséget a Szolgáltató a helyi díjszabás alapján számítja ki, és a távozás
            előtt kell rendezni.
          </p>

          <h2>10. A Szolgáltató felelőssége</h2>
          <p>
            A Szolgáltató mindent megtesz a szolgáltatások zavartalan, biztonságos és higiénikus
            biztosításáért. A wellness szolgáltatásokat (medence, dézsa, szaunák, sóbarlang) a
            Vendég saját felelősségére veszi igénybe; a Szolgáltató nem felel a Használati
            Szabályzatok és a Házirend be nem tartásából eredő károkért, balesetekért.
          </p>
          <p>
            A Szolgáltató nem felel a Vendég által a szálláshelyre bevitt értéktárgyak elvesztéséért
            vagy megrongálódásáért, kivéve, ha azt szándékos vagy súlyosan gondatlan magatartása
            okozta. A Szolgáltató jogosult a szolgáltatás igénybevételét megtagadni vagy korlátozni,
            ha a Vendég a szabályokat megsérti, illetve karbantartás, fertőtlenítés vagy rendkívüli
            körülmény (pl. időjárás, hatósági előírás) azt indokolja.
          </p>

          <h2>11. Adatkezelés</h2>
          <p>
            A Szolgáltató a foglalás és a jogszabályi (vendégnyilvántartási, számviteli)
            kötelezettségek teljesítése érdekében kezeli a Vendég személyes adatait, az Európai
            Parlament és a Tanács (EU) 2016/679 rendelete (GDPR) és a vonatkozó magyar jogszabályok
            szerint. Az adatkezelés részleteit külön Adatkezelési Tájékoztató tartalmazza, amely a
            weboldalon elérhető: <Link href="/adatvedelem">www.vikivendeghaz.hu/adatvedelem</Link>.
          </p>

          <h2>12. Panaszkezelés és vitarendezés</h2>
          <p>
            Az esetleges panaszokat a Vendég a helyszínen, illetve utólag a Szolgáltató fenti
            elérhetőségein jelezheti; a Szolgáltató a panaszt kivizsgálja és megválaszolja. A
            szerződéses jogviszonyból eredő vitás kérdések rendezésére a Szolgáltatóval szemben a
            foglaló (szerződéses fél) jogosult.
          </p>
          <p>
            A felek a vitáikat elsősorban békés úton, egyeztetéssel rendezik. Fogyasztói jogvita
            esetén a Vendég a lakóhelye vagy a Szolgáltató székhelye szerint illetékes békéltető
            testülethez fordulhat. A jelen ÁSZF-ben nem szabályozott kérdésekben a magyar jog,
            különösen a Polgári Törvénykönyv rendelkezései az irányadók.
          </p>

          <h2>13. Vegyes és záró rendelkezések</h2>
          <p>
            A Szolgáltató fenntartja a jogot a jelen ÁSZF egyoldalú módosítására; a módosítás a
            weboldalon való közzététellel lép hatályba, és a hatálybalépést követően leadott
            foglalásokra irányadó. A már visszaigazolt foglalásokra a foglalás időpontjában hatályos
            ÁSZF alkalmazandó.
          </p>
          <p>Jelen ÁSZF a 2020. december 10. napjától hatályos.</p>

          <div className="mt-10 pt-6 border-t border-[var(--border)] text-sm text-[var(--text)]/60">
            <p className="mb-1">Kelt: Szilvásvárad, 2020. december 10.</p>
            <p className="mb-1">Kiss Józsefné</p>
            <p>Szolgáltató</p>
          </div>
        </div>
      </section>
    </div>
  );
}
