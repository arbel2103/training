import type { Food, FoodGroup } from './types'

export const foodGroupLabel: Record<FoodGroup, string> = {
  grain: 'דגנים ופחמימות',
  protein: 'בשר, דגים וביצים',
  dairy: 'חלב וגבינות',
  vegetable: 'ירקות',
  fruit: 'פירות',
  legume: 'קטניות',
  fat: 'שומנים ואגוזים',
  dish: 'מנות ותבשילים',
  sports: 'תזונת ספורט',
  drink: 'משקאות',
  snack: 'חטיפים ומתוקים',
}

/**
 * Curated Hebrew/Israeli food database. Values are per 100 g of the food *as
 * eaten* (cooked where relevant — mess-hall rice is logged cooked, not dry).
 * `portions` gives the gram weight of each serving unit for that specific food,
 * which is what makes "2 כפות הגשה של אורז" resolve to a real number.
 */
export const FOODS: Food[] = [
  // ---------- דגנים ופחמימות ----------
  {
    id: 'rice-white',
    name: 'אורז לבן מבושל',
    group: 'grain',
    per100g: { kcal: 130, carbs: 28, protein: 2.7, fat: 0.3, sodium: 1, fiber: 0.4 },
    portions: { servingSpoon: 90, ladle: 180, spoon: 20, cup: 160, plate: 250 },
  },
  {
    id: 'rice-brown',
    name: 'אורז מלא מבושל',
    group: 'grain',
    per100g: { kcal: 123, carbs: 26, protein: 2.7, fat: 1, sodium: 2, fiber: 1.8 },
    portions: { servingSpoon: 90, ladle: 180, cup: 160, plate: 250 },
  },
  {
    id: 'pasta',
    name: 'פסטה מבושלת',
    group: 'grain',
    per100g: { kcal: 158, carbs: 31, protein: 5.8, fat: 0.9, sodium: 1, fiber: 1.8 },
    portions: { servingSpoon: 80, ladle: 170, cup: 140, plate: 250 },
  },
  {
    id: 'couscous',
    name: 'קוסקוס מבושל',
    group: 'grain',
    per100g: { kcal: 112, carbs: 23, protein: 3.8, fat: 0.2, sodium: 5, fiber: 1.4 },
    portions: { servingSpoon: 85, ladle: 170, cup: 155, plate: 250 },
  },
  {
    id: 'burghul',
    name: 'בורגול מבושל',
    group: 'grain',
    per100g: { kcal: 83, carbs: 19, protein: 3, fat: 0.2, sodium: 5, fiber: 4.5 },
    portions: { servingSpoon: 85, ladle: 170, cup: 155 },
  },
  {
    id: 'quinoa',
    name: 'קינואה מבושלת',
    group: 'grain',
    per100g: { kcal: 120, carbs: 21, protein: 4.4, fat: 1.9, sodium: 7, fiber: 2.8 },
    portions: { servingSpoon: 85, ladle: 170, cup: 155 },
  },
  {
    id: 'potato-cooked',
    name: 'תפוח אדמה מבושל',
    group: 'grain',
    per100g: { kcal: 87, carbs: 20, protein: 1.9, fat: 0.1, sodium: 4, fiber: 1.8 },
    portions: { servingSpoon: 90, ladle: 180, unit: 150, plate: 250 },
  },
  {
    id: 'potato-mashed',
    name: 'פירה',
    group: 'grain',
    per100g: { kcal: 113, carbs: 17, protein: 2, fat: 4.2, sodium: 320, fiber: 1.5 },
    portions: { servingSpoon: 100, ladle: 200, cup: 210 },
  },
  {
    id: 'potato-fries',
    name: "צ'יפס אפוי",
    group: 'grain',
    per100g: { kcal: 190, carbs: 28, protein: 2.7, fat: 7.5, sodium: 250, fiber: 2.8 },
    portions: { servingSpoon: 70, plate: 200 },
  },
  {
    id: 'sweet-potato',
    name: 'בטטה אפויה',
    group: 'grain',
    per100g: { kcal: 90, carbs: 21, protein: 2, fat: 0.2, sodium: 36, fiber: 3.3 },
    portions: { servingSpoon: 90, unit: 180, plate: 250 },
  },
  {
    id: 'bread-white',
    name: 'לחם לבן',
    group: 'grain',
    per100g: { kcal: 265, carbs: 49, protein: 9, fat: 3.2, sodium: 490, fiber: 2.7 },
    portions: { unit: 30 },
  },
  {
    id: 'bread-whole',
    name: 'לחם מלא',
    group: 'grain',
    per100g: { kcal: 247, carbs: 41, protein: 13, fat: 3.4, sodium: 450, fiber: 7 },
    portions: { unit: 32 },
  },
  {
    id: 'pita',
    name: 'פיתה',
    group: 'grain',
    per100g: { kcal: 275, carbs: 55, protein: 9, fat: 1.2, sodium: 530, fiber: 2.2 },
    portions: { unit: 70 },
  },
  {
    id: 'oats',
    name: 'שיבולת שועל (יבש)',
    group: 'grain',
    per100g: { kcal: 379, carbs: 67, protein: 13, fat: 6.5, sodium: 6, fiber: 10 },
    portions: { spoon: 10, cup: 80 },
  },
  {
    id: 'granola',
    name: 'גרנולה',
    group: 'grain',
    per100g: { kcal: 471, carbs: 64, protein: 10, fat: 20, sodium: 30, fiber: 7 },
    portions: { spoon: 12, cup: 110 },
  },
  {
    id: 'cornflakes',
    name: 'קורנפלקס',
    group: 'grain',
    per100g: { kcal: 357, carbs: 84, protein: 7, fat: 0.4, sodium: 650, fiber: 3 },
    portions: { cup: 30 },
  },
  {
    id: 'cracker',
    name: 'פריכיות אורז',
    group: 'grain',
    per100g: { kcal: 387, carbs: 81, protein: 8, fat: 3, sodium: 30, fiber: 3 },
    portions: { unit: 9 },
  },

  // ---------- בשר, דגים וביצים ----------
  {
    id: 'chicken-breast',
    name: 'חזה עוף בגריל',
    group: 'protein',
    per100g: { kcal: 165, carbs: 0, protein: 31, fat: 3.6, sodium: 74 },
    portions: { servingSpoon: 70, unit: 150, plate: 200 },
  },
  {
    id: 'chicken-thigh',
    name: 'שוקיים/ירך עוף',
    group: 'protein',
    per100g: { kcal: 209, carbs: 0, protein: 26, fat: 11, sodium: 90 },
    portions: { servingSpoon: 80, unit: 120, plate: 220 },
  },
  {
    id: 'chicken-schnitzel',
    name: 'שניצל עוף',
    group: 'protein',
    per100g: { kcal: 290, carbs: 18, protein: 20, fat: 15, sodium: 480 },
    portions: { unit: 90, plate: 200 },
  },
  {
    id: 'beef-lean',
    name: 'בשר בקר רזה מבושל',
    group: 'protein',
    per100g: { kcal: 217, carbs: 0, protein: 27, fat: 12, sodium: 65 },
    portions: { servingSpoon: 75, plate: 200 },
  },
  {
    id: 'ground-beef',
    name: 'בשר טחון מבושל',
    group: 'protein',
    per100g: { kcal: 250, carbs: 2, protein: 24, fat: 16, sodium: 320 },
    portions: { servingSpoon: 80, ladle: 170 },
  },
  {
    id: 'turkey',
    name: 'הודו בגריל',
    group: 'protein',
    per100g: { kcal: 155, carbs: 0, protein: 29, fat: 4, sodium: 90 },
    portions: { servingSpoon: 70, plate: 200 },
  },
  {
    id: 'salmon',
    name: 'סלמון',
    group: 'protein',
    per100g: { kcal: 208, carbs: 0, protein: 20, fat: 13, sodium: 60 },
    portions: { unit: 150, plate: 180 },
  },
  {
    id: 'tuna-can',
    name: 'טונה במים (מסונן)',
    group: 'protein',
    per100g: { kcal: 116, carbs: 0, protein: 26, fat: 1, sodium: 320 },
    portions: { unit: 140, spoon: 20 },
  },
  {
    id: 'white-fish',
    name: 'דג לבן אפוי',
    group: 'protein',
    per100g: { kcal: 105, carbs: 0, protein: 22, fat: 1.5, sodium: 90 },
    portions: { unit: 150, plate: 180 },
  },
  {
    id: 'egg',
    name: 'ביצה קשה/מבושלת',
    group: 'protein',
    per100g: { kcal: 155, carbs: 1.1, protein: 13, fat: 11, sodium: 124 },
    portions: { unit: 55 },
  },
  {
    id: 'egg-scrambled',
    name: 'חביתה',
    group: 'protein',
    per100g: { kcal: 190, carbs: 1.5, protein: 13, fat: 15, sodium: 210 },
    portions: { unit: 70, servingSpoon: 70 },
  },
  {
    id: 'kebab',
    name: 'קבב / קציצות בשר',
    group: 'protein',
    per100g: { kcal: 260, carbs: 6, protein: 19, fat: 18, sodium: 520 },
    portions: { unit: 80, servingSpoon: 80 },
  },

  // ---------- חלב וגבינות ----------
  {
    id: 'milk-3',
    name: 'חלב 3%',
    group: 'dairy',
    per100g: { kcal: 61, carbs: 4.7, protein: 3.3, fat: 3.3, sodium: 43 },
    portions: { cup: 240, spoon: 15 },
  },
  {
    id: 'milk-1',
    name: 'חלב 1%',
    group: 'dairy',
    per100g: { kcal: 42, carbs: 4.8, protein: 3.4, fat: 1, sodium: 44 },
    portions: { cup: 240 },
  },
  {
    id: 'yogurt-plain',
    name: 'יוגורט טבעי 3%',
    group: 'dairy',
    per100g: { kcal: 61, carbs: 4.7, protein: 3.5, fat: 3.3, sodium: 46 },
    portions: { unit: 150, cup: 240, spoon: 18 },
  },
  {
    id: 'yogurt-greek',
    name: 'יוגורט יווני 0%',
    group: 'dairy',
    per100g: { kcal: 59, carbs: 3.6, protein: 10, fat: 0.4, sodium: 36 },
    portions: { unit: 150, cup: 240, spoon: 18 },
  },
  {
    id: 'cottage',
    name: 'קוטג׳ 5%',
    group: 'dairy',
    per100g: { kcal: 103, carbs: 3.4, protein: 11, fat: 5, sodium: 380 },
    portions: { unit: 250, spoon: 20 },
  },
  {
    id: 'white-cheese',
    name: 'גבינה לבנה 5%',
    group: 'dairy',
    per100g: { kcal: 92, carbs: 3.8, protein: 9, fat: 5, sodium: 300 },
    portions: { unit: 250, spoon: 20 },
  },
  {
    id: 'yellow-cheese',
    name: 'גבינה צהובה 28%',
    group: 'dairy',
    per100g: { kcal: 353, carbs: 1.3, protein: 25, fat: 28, sodium: 700 },
    portions: { unit: 25 },
  },
  {
    id: 'feta',
    name: 'גבינת פטה/בולגרית',
    group: 'dairy',
    per100g: { kcal: 264, carbs: 4, protein: 14, fat: 21, sodium: 1100 },
    portions: { spoon: 20, servingSpoon: 50 },
  },
  {
    id: 'labaneh',
    name: 'לבנה',
    group: 'dairy',
    per100g: { kcal: 174, carbs: 4, protein: 8, fat: 14, sodium: 400 },
    portions: { spoon: 20, unit: 200 },
  },

  // ---------- ירקות ----------
  {
    id: 'salad-veg',
    name: 'סלט ירקות (ללא רוטב)',
    group: 'vegetable',
    per100g: { kcal: 22, carbs: 4, protein: 1, fat: 0.2, sodium: 10, fiber: 1.5 },
    portions: { servingSpoon: 60, ladle: 130, cup: 150, plate: 200 },
  },
  {
    id: 'cucumber',
    name: 'מלפפון',
    group: 'vegetable',
    per100g: { kcal: 15, carbs: 3.6, protein: 0.7, fat: 0.1, sodium: 2, fiber: 0.5 },
    portions: { unit: 120 },
  },
  {
    id: 'tomato',
    name: 'עגבנייה',
    group: 'vegetable',
    per100g: { kcal: 18, carbs: 3.9, protein: 0.9, fat: 0.2, sodium: 5, fiber: 1.2 },
    portions: { unit: 120 },
  },
  {
    id: 'veg-cooked',
    name: 'ירקות מבושלים/אפויים',
    group: 'vegetable',
    per100g: { kcal: 55, carbs: 8, protein: 2, fat: 2, sodium: 200, fiber: 3 },
    portions: { servingSpoon: 80, ladle: 170, plate: 220 },
  },
  {
    id: 'corn',
    name: 'תירס',
    group: 'vegetable',
    per100g: { kcal: 96, carbs: 21, protein: 3.4, fat: 1.5, sodium: 15, fiber: 2.4 },
    portions: { servingSpoon: 75, spoon: 18, cup: 165 },
  },
  {
    id: 'avocado',
    name: 'אבוקדו',
    group: 'vegetable',
    per100g: { kcal: 160, carbs: 9, protein: 2, fat: 15, sodium: 7, fiber: 7 },
    portions: { unit: 150, spoon: 25 },
  },

  // ---------- פירות ----------
  {
    id: 'banana',
    name: 'בננה',
    group: 'fruit',
    per100g: { kcal: 89, carbs: 23, protein: 1.1, fat: 0.3, sodium: 1, fiber: 2.6, sugar: 12 },
    portions: { unit: 120 },
  },
  {
    id: 'apple',
    name: 'תפוח',
    group: 'fruit',
    per100g: { kcal: 52, carbs: 14, protein: 0.3, fat: 0.2, sodium: 1, fiber: 2.4, sugar: 10 },
    portions: { unit: 180 },
  },
  {
    id: 'orange',
    name: 'תפוז',
    group: 'fruit',
    per100g: { kcal: 47, carbs: 12, protein: 0.9, fat: 0.1, sodium: 0, fiber: 2.4, sugar: 9 },
    portions: { unit: 150 },
  },
  {
    id: 'date',
    name: 'תמרים',
    group: 'fruit',
    per100g: { kcal: 282, carbs: 75, protein: 2.5, fat: 0.4, sodium: 2, fiber: 8, sugar: 63 },
    portions: { unit: 8 },
  },
  {
    id: 'watermelon',
    name: 'אבטיח',
    group: 'fruit',
    per100g: { kcal: 30, carbs: 8, protein: 0.6, fat: 0.2, sodium: 1, fiber: 0.4, sugar: 6 },
    portions: { servingSpoon: 90, plate: 300 },
  },
  {
    id: 'grapes',
    name: 'ענבים',
    group: 'fruit',
    per100g: { kcal: 69, carbs: 18, protein: 0.7, fat: 0.2, sodium: 2, fiber: 0.9, sugar: 16 },
    portions: { cup: 150 },
  },

  // ---------- קטניות ----------
  {
    id: 'chickpeas',
    name: 'חומוס גרגרים מבושל',
    group: 'legume',
    per100g: { kcal: 164, carbs: 27, protein: 9, fat: 2.6, sodium: 7, fiber: 8 },
    portions: { servingSpoon: 80, ladle: 165, cup: 160 },
  },
  {
    id: 'hummus-spread',
    name: 'חומוס ממרח',
    group: 'legume',
    per100g: { kcal: 177, carbs: 20, protein: 8, fat: 8, sodium: 380, fiber: 6 },
    portions: { spoon: 25, servingSpoon: 60 },
  },
  {
    id: 'lentils',
    name: 'עדשים מבושלות',
    group: 'legume',
    per100g: { kcal: 116, carbs: 20, protein: 9, fat: 0.4, sodium: 5, fiber: 8 },
    portions: { servingSpoon: 80, ladle: 170, cup: 160 },
  },
  {
    id: 'beans',
    name: 'שעועית מבושלת',
    group: 'legume',
    per100g: { kcal: 127, carbs: 23, protein: 8.7, fat: 0.5, sodium: 6, fiber: 6 },
    portions: { servingSpoon: 80, ladle: 170, cup: 160 },
  },
  {
    id: 'tofu',
    name: 'טופו',
    group: 'legume',
    per100g: { kcal: 76, carbs: 1.9, protein: 8, fat: 4.8, sodium: 7 },
    portions: { servingSpoon: 70, unit: 100 },
  },
  {
    id: 'falafel',
    name: 'פלאפל',
    group: 'legume',
    per100g: { kcal: 333, carbs: 32, protein: 13, fat: 18, sodium: 590, fiber: 5 },
    portions: { unit: 17 },
  },

  // ---------- שומנים ואגוזים ----------
  {
    id: 'olive-oil',
    name: 'שמן זית',
    group: 'fat',
    per100g: { kcal: 884, carbs: 0, protein: 0, fat: 100, sodium: 2 },
    portions: { spoon: 14 },
  },
  {
    id: 'tehina',
    name: 'טחינה גולמית',
    group: 'fat',
    per100g: { kcal: 595, carbs: 21, protein: 17, fat: 54, sodium: 115, fiber: 9 },
    portions: { spoon: 15 },
  },
  {
    id: 'tehina-prepared',
    name: 'טחינה מוכנה',
    group: 'fat',
    per100g: { kcal: 291, carbs: 10, protein: 8, fat: 26, sodium: 350 },
    portions: { spoon: 18, servingSpoon: 45 },
  },
  {
    id: 'almonds',
    name: 'שקדים',
    group: 'fat',
    per100g: { kcal: 579, carbs: 22, protein: 21, fat: 50, sodium: 1, fiber: 12 },
    portions: { spoon: 12, cup: 140 },
  },
  {
    id: 'walnuts',
    name: 'אגוזי מלך',
    group: 'fat',
    per100g: { kcal: 654, carbs: 14, protein: 15, fat: 65, sodium: 2, fiber: 7 },
    portions: { spoon: 10 },
  },
  {
    id: 'peanut-butter',
    name: 'חמאת בוטנים',
    group: 'fat',
    per100g: { kcal: 588, carbs: 20, protein: 25, fat: 50, sodium: 430, fiber: 6 },
    portions: { spoon: 16 },
  },
  {
    id: 'mayo',
    name: 'מיונז',
    group: 'fat',
    per100g: { kcal: 680, carbs: 1, protein: 1, fat: 75, sodium: 630 },
    portions: { spoon: 14 },
  },

  // ---------- מנות ותבשילים (חדר אוכל) ----------
  {
    id: 'shakshuka',
    name: 'שקשוקה',
    group: 'dish',
    per100g: { kcal: 95, carbs: 6, protein: 5, fat: 6, sodium: 400, fiber: 1.5 },
    portions: { ladle: 200, plate: 300, servingSpoon: 90 },
  },
  {
    id: 'soup-veg',
    name: 'מרק ירקות',
    group: 'dish',
    per100g: { kcal: 40, carbs: 6, protein: 1.5, fat: 1.2, sodium: 380, fiber: 1.2 },
    portions: { ladle: 200, cup: 240, plate: 300 },
  },
  {
    id: 'soup-chicken',
    name: 'מרק עוף עם אטריות',
    group: 'dish',
    per100g: { kcal: 62, carbs: 7, protein: 4, fat: 2, sodium: 450 },
    portions: { ladle: 200, plate: 300 },
  },
  {
    id: 'meat-stew',
    name: 'תבשיל בשר ברוטב',
    group: 'dish',
    per100g: { kcal: 165, carbs: 6, protein: 15, fat: 9, sodium: 480 },
    portions: { ladle: 190, servingSpoon: 85, plate: 280 },
  },
  {
    id: 'chicken-stew',
    name: 'תבשיל עוף ברוטב',
    group: 'dish',
    per100g: { kcal: 140, carbs: 5, protein: 16, fat: 6, sodium: 450 },
    portions: { ladle: 190, servingSpoon: 85, plate: 280 },
  },
  {
    id: 'pasta-bolognese',
    name: 'פסטה ברוטב בשר',
    group: 'dish',
    per100g: { kcal: 165, carbs: 20, protein: 8, fat: 6, sodium: 400 },
    portions: { ladle: 190, plate: 300, servingSpoon: 90 },
  },
  {
    id: 'lasagna',
    name: 'לזניה',
    group: 'dish',
    per100g: { kcal: 180, carbs: 17, protein: 10, fat: 8, sodium: 470 },
    portions: { unit: 250, plate: 250 },
  },
  {
    id: 'pizza',
    name: 'פיצה',
    group: 'dish',
    per100g: { kcal: 266, carbs: 33, protein: 11, fat: 10, sodium: 600 },
    portions: { unit: 110 },
  },
  {
    id: 'sabich',
    name: 'סביח בפיתה',
    group: 'dish',
    per100g: { kcal: 210, carbs: 24, protein: 7, fat: 10, sodium: 480 },
    portions: { unit: 300 },
  },
  {
    id: 'shawarma',
    name: 'שווארמה',
    group: 'dish',
    per100g: { kcal: 260, carbs: 2, protein: 22, fat: 19, sodium: 620 },
    portions: { servingSpoon: 80, unit: 250 },
  },
  {
    id: 'rice-with-veg',
    name: 'אורז עם ירקות',
    group: 'dish',
    per100g: { kcal: 140, carbs: 26, protein: 3.2, fat: 2.8, sodium: 300, fiber: 1.5 },
    portions: { servingSpoon: 90, ladle: 180, plate: 260 },
  },
  {
    id: 'majadra',
    name: 'מג׳דרה',
    group: 'dish',
    per100g: { kcal: 155, carbs: 26, protein: 5, fat: 4, sodium: 320, fiber: 4 },
    portions: { servingSpoon: 90, ladle: 180, plate: 260 },
  },

  // ---------- תזונת ספורט ----------
  {
    id: 'energy-gel',
    name: 'ג׳ל אנרגיה',
    group: 'sports',
    per100g: { kcal: 250, carbs: 62, protein: 0, fat: 0, sodium: 200 },
    portions: { unit: 40 },
  },
  {
    id: 'sports-drink',
    name: 'משקה איזוטוני',
    group: 'sports',
    per100g: { kcal: 26, carbs: 6.4, protein: 0, fat: 0, sodium: 41 },
    portions: { cup: 250, unit: 500 },
  },
  {
    id: 'energy-bar',
    name: 'חטיף אנרגיה',
    group: 'sports',
    per100g: { kcal: 380, carbs: 60, protein: 9, fat: 11, sodium: 180, fiber: 5 },
    portions: { unit: 50 },
  },
  {
    id: 'whey',
    name: 'אבקת חלבון (whey)',
    group: 'sports',
    per100g: { kcal: 380, carbs: 8, protein: 78, fat: 5, sodium: 250 },
    portions: { unit: 30, spoon: 12 },
  },
  {
    id: 'recovery-shake',
    name: 'שייק התאוששות',
    group: 'sports',
    per100g: { kcal: 70, carbs: 11, protein: 4.5, fat: 0.8, sodium: 60 },
    portions: { cup: 250, unit: 500 },
  },
  {
    id: 'electrolyte-tab',
    name: 'טבליית אלקטרוליטים',
    group: 'sports',
    per100g: { kcal: 130, carbs: 30, protein: 0, fat: 0, sodium: 7000 },
    portions: { unit: 5 },
  },

  // ---------- משקאות ----------
  {
    id: 'water',
    name: 'מים',
    group: 'drink',
    per100g: { kcal: 0, carbs: 0, protein: 0, fat: 0, sodium: 0 },
    portions: { cup: 250, unit: 500 },
  },
  {
    id: 'orange-juice',
    name: 'מיץ תפוזים',
    group: 'drink',
    per100g: { kcal: 45, carbs: 10, protein: 0.7, fat: 0.2, sodium: 1, sugar: 8 },
    portions: { cup: 250 },
  },
  {
    id: 'cola',
    name: 'קולה',
    group: 'drink',
    per100g: { kcal: 42, carbs: 10.6, protein: 0, fat: 0, sodium: 4, sugar: 10.6 },
    portions: { cup: 250, unit: 330 },
  },
  {
    id: 'coffee-milk',
    name: 'קפה עם חלב',
    group: 'drink',
    per100g: { kcal: 35, carbs: 3, protein: 2, fat: 1.8, sodium: 25 },
    portions: { cup: 200 },
  },
  {
    id: 'beer',
    name: 'בירה',
    group: 'drink',
    per100g: { kcal: 43, carbs: 3.6, protein: 0.5, fat: 0, sodium: 4 },
    portions: { unit: 330, cup: 250 },
  },

  // ---------- חטיפים ומתוקים ----------
  {
    id: 'chocolate-milk-bar',
    name: 'שוקולד חלב',
    group: 'snack',
    per100g: { kcal: 535, carbs: 59, protein: 7.6, fat: 30, sodium: 79, sugar: 52 },
    portions: { unit: 100, spoon: 12 },
  },
  {
    id: 'bamba',
    name: 'במבה',
    group: 'snack',
    per100g: { kcal: 553, carbs: 47, protein: 14, fat: 34, sodium: 400 },
    portions: { unit: 25 },
  },
  {
    id: 'bisli',
    name: 'ביסלי',
    group: 'snack',
    per100g: { kcal: 470, carbs: 62, protein: 9, fat: 20, sodium: 900 },
    portions: { unit: 55 },
  },
  {
    id: 'cookie',
    name: 'עוגייה',
    group: 'snack',
    per100g: { kcal: 480, carbs: 64, protein: 6, fat: 22, sodium: 350, sugar: 32 },
    portions: { unit: 15 },
  },
  {
    id: 'cake',
    name: 'עוגה',
    group: 'snack',
    per100g: { kcal: 380, carbs: 50, protein: 5, fat: 18, sodium: 300, sugar: 32 },
    portions: { unit: 90, plate: 120 },
  },
  {
    id: 'ice-cream',
    name: 'גלידה',
    group: 'snack',
    per100g: { kcal: 207, carbs: 24, protein: 3.5, fat: 11, sodium: 80, sugar: 21 },
    portions: { cup: 130, servingSpoon: 60 },
  },
  {
    id: 'halva',
    name: 'חלבה',
    group: 'snack',
    per100g: { kcal: 520, carbs: 50, protein: 12, fat: 31, sodium: 200, sugar: 42 },
    portions: { unit: 30 },
  },
]

/** Everything searchable: the bundled DB plus the user's own foods. */
export function allFoods(customFoods: Food[]): Food[] {
  return [...customFoods, ...FOODS]
}

/** Simple Hebrew substring search, ranked so prefix matches come first. */
export function searchFoods(foods: Food[], query: string, limit = 40): Food[] {
  const q = query.trim()
  if (!q) return foods.slice(0, limit)
  const lower = q.toLowerCase()
  const scored: { f: Food; score: number }[] = []
  for (const f of foods) {
    const name = f.name.toLowerCase()
    const i = name.indexOf(lower)
    if (i === -1) continue
    scored.push({ f, score: i === 0 ? 0 : 1 })
  }
  scored.sort((a, b) => a.score - b.score || a.f.name.localeCompare(b.f.name, 'he'))
  return scored.slice(0, limit).map((s) => s.f)
}

/** Look a food up by id across bundled + custom. */
export function findFood(foods: Food[], id: string): Food | undefined {
  return foods.find((f) => f.id === id)
}
