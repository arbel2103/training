# מערכת אימונים

אפליקציית ניהול אימונים אישית — מעקב, תוכנית אימונים, ותכנון שבועי המחובר ל-Google Calendar.
נבנתה ב-React + Vite + TypeScript + Tailwind. הנתונים נשמרים מקומית בדפדפן (`localStorage`).

## שלושת העמודים
1. **מעקב אימונים** — הזנת האימונים השבועיים (כוח / אירובי / אחר) + היסטוריה (רשימה וניתוח לפי תקופה).
2. **תוכנית אימונים** — אימוני כוח (טאבים דינמיים + תרגילים עם חזרות לפי סטים) ויעדים שבועיים לאירובי.
3. **תכנון האימונים** — לוח שבועי מול היומן, השוואה ליעדים, ושליחת האימונים ליומן האישי לאחר אישור.

## הרצה מקומית
```bash
npm install
npm run dev
```
פתיחה בכתובת שמודפסת (למשל `http://localhost:5173/training/`).

## חיבור Google Calendar (עמוד התכנון)
1. היכנס ל-[Google Cloud Console](https://console.cloud.google.com/) → צור פרויקט.
2. **APIs & Services → Library** → הפעל את **Google Calendar API**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
4. תחת **Authorized JavaScript origins** הוסף:
   - `http://localhost:5173`
   - `https://<USERNAME>.github.io`  ← הכתובת של ה-GitHub Pages שלך
5. העתק את ה-Client ID:
   - **מקומית:** צור קובץ `.env` (העתק מ-`.env.example`) והדבק תחת `VITE_GOOGLE_CLIENT_ID`.
   - **ל-Pages:** Settings → Secrets and variables → Actions → **Variables** → `VITE_GOOGLE_CLIENT_ID`.

> היומן הנקרא הוא הראשון ששמו מכיל "אלבטרוס"; האימונים נשלחים ליומן הראשי (primary).

## פריסה ל-GitHub Pages
1. דחוף את הקוד ל-repo בשם `training` בענף `main`.
2. Settings → **Pages** → Source = **GitHub Actions**.
3. ה-workflow שב-`.github/workflows/deploy.yml` בונה ומפרסם אוטומטית בכל push.
4. האתר יהיה זמין בכתובת `https://<USERNAME>.github.io/training/`.

> אם נתיב ה-repo שונה מ-`training`, עדכן את `base` ב-`vite.config.ts` בהתאם.
