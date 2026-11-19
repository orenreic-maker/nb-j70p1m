# BreathAnew

מונה גמילה מעישון בעברית, מימין לשמאל. הנתונים נשארים במכשיר. אין חשבון ואין שרת.

אפשר לנסות את גרסת הדפדפן לפני החנויות. אחרי מיזוג הענף הזה, היא חיה בכתובת:

`https://orenreic-maker.github.io/nb-j70p1m/preview/`

האפליקציה האישית הישנה בשורש האתר לא משתנה.

---

## עברית · איך מריצים על המק מיני (Apple silicon)

צריך: Mac עם שבב של אפל, חיבור לאינטרנט, וסבלנות בפעם הראשונה. לא צריך לכתוב קוד.

### מה להתקין פעם אחת

1. **Node.js 22**. נכנסים ל-[nodejs.org](https://nodejs.org), מורידים את גרסת 22, ופותחים את הקובץ. בטרמינל: `node -v` צריך להראות `v22`.
2. **Xcode 26** מחנות האפליקציות של מק. בפתיחה הראשונה מאשרים את הרישיון. אחר כך בטרמינל:
   `xcode-select --install`
   אם המק אומר שכלי השורה כבר מותקנים, ממשיכים.
3. **CocoaPods**, כדי שהפרויקט של אייפון ימשוך ספריות:
   `sudo gem install cocoapods`
4. **Android Studio** מ-[developer.android.com/studio](https://developer.android.com/studio). בפתיחה הראשונה עוברים את האשף ומתקינים את ה-SDK שהוא מציע.

### להוריד את הקוד

1. בטרמינל:
   `git clone https://github.com/orenreic-maker/nb-j70p1m.git`
   `cd nb-j70p1m`
2. עוברים לתיקיית האפליקציה החדשה, לא לשורש:
   `cd app`
   `npm install`

הקבצים בשורש (`index.html`, `sw.js`, האייקונים) הם האפליקציה האישית החיה. לא נוגעים בהם.

### לראות בדפדפן

```
npm run dev
```

נפתח דפדפן אל הכתובת שהטרמינל מדפיס. הכל בעברית.

כדי לבנות את תיקיית `preview/` שהאתר מגיש:

```
npm run build:preview
```

הפקודה כותבת רק לתיקייה `preview/` בשורש המאגר. היא לא נוגעת בקבצי האפליקציה הישנה.

### אייפון

1. בתוך `app`:
   `npm run build`
   `npx cap sync ios`
   `npx cap open ios`
2. נפתח Xcode. למעלה בוחרים את היעד **App** וסימולטור של אייפון, או את האייפון עצמו אם הוא מחובר.
3. ב-Signing & Capabilities בוחרים את ה-Team של אפל (החשבון החינמי מספיק להרצה על המכשיר האישי).
4. לוחצים על כפתור המשולש (Run).

מזהה האפליקציה, `com.orenreic.breathanew`, כתוב במקום אחד: `app/app.config.json`. אם משנים אותו, מריצים שוב `npx cap sync`.

### אנדרואיד

1. בתוך `app`:
   `npm run build`
   `npx cap sync android`
   `npx cap open android`
2. Android Studio יוריד Gradle בפעם הראשונה. ממתינים עד שנגמר.
3. למעלה בוחרים מכשיר או אמולטור, ולוחצים Run.

אפשר גם בלי Android Studio, מתוך `app`:

```
npm run android:debug
```

נוצר קובץ APK לניסוי תחת `app/android/app/build/outputs/apk/debug/`.

### פרסומות ורכישה

הן מחווטות אבל **כבויות**. ב-`app/app.config.json` השדה `adsEnabled` הוא `false`. לא נוצרים חשבונות AdMob או חנות. מזהי המודעות הם מזהי הבדיקה של גוגל בלבד. הרכישה "בלי פרסומות" משתמשת במזהה `com.orenreic.breathanew.removeads` ובמציין מקום `14.90 ₪` עד שחנות תחזיר מחיר אמיתי.

בדפדפן אין פרסומות, ואין רכישה. תזכורות מקומיות עובדות רק באפליקציה המותקנת.

### גיבוי מהאפליקציה הישנה

באפליקציה הישנה: הגדרות ← ייצוא גיבוי. ב-BreathAnew: הגדרות ← שחזור מגיבוי, ובוחרים את קובץ ה-JSON. הייבוא לא נוגע בנתונים של האפליקציה הישנה.

### מדיניות פרטיות

העמוד נמצא ב-`app/public/privacy.html` וגם בתוך האפליקציה. אחרי הבנייה הוא ב-`preview/privacy.html`. אפשר לארח אותו כמו שהוא.

---

## English · build on the Mac mini

BreathAnew is the store app. The files at the repository root are the live personal app. Do not edit those.

1. Install Node.js 22 from [nodejs.org](https://nodejs.org). `node -v` should show v22.
2. Install Xcode 26 from the Mac App Store, open it once, accept the license, then run `xcode-select --install`.
3. Install CocoaPods: `sudo gem install cocoapods`.
4. Install Android Studio and finish its first-run SDK setup.
5. Clone the repo, then:

```
cd app
npm install
npm run dev
```

That opens the Hebrew app in a browser.

Publishable static preview (writes only `preview/` at the repo root):

```
npm run build:preview
```

iPhone:

```
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode, pick the App target, your Team, a simulator or your phone, and press Run.

Android:

```
npm run build
npx cap sync android
npx cap open android
```

Or `npm run android:debug` for a debug APK.

The bundle id lives only in `app/app.config.json` (`com.orenreic.breathanew`). Ads and the remove-ads purchase are wired and switched off (`adsEnabled: false`). Test AdMob ids only. No store accounts are created by this project.

On the web there are no ads. Local notifications and the purchase sheet work in the installed app; the browser explains that instead of failing.

Import an old JSON backup from Settings. The preview uses storage key `breathanew.v1` (Capacitor stores it as `CapacitorStorage.breathanew.v1`). It never reads or writes `nshima.v1`.

Fonts: Karantina and IBM Plex Sans Hebrew, SIL Open Font License. License files are in `app/public/fonts/`.
