# LOG

Aquest document és la bitàcola del projecte: serveix per registrar el que s'ha fet
i quins prompts d'IA s'han fet servir per fer-ho.

---

## Eina i model d'IA utilitzat

- **Eina:** Google Gemini
- **Model:** Gemini 3.6 Flash

---

## Registre d'usos de la IA

---

### Ús 1 

**Prompt literal:**
> "Com faig a Mongoose un model Question en TypeScript per a preguntes d'un exercici amb soft delete i una llista de respostes a dins?"

**Resposta de la IA:**
Va donar un esquema amb el model de preguntes i un array de respostes com a subdocuments.

**Incoherències detectades:**
Al model no va posar `versionKey: false` ni els camps `isDeleted` i `deletedAt` que fem servir al projecte pel soft delete.

**Solució/adaptació manual:**
Vaig copiar l'estructura de `Exercise.ts` posant `isDeleted: false`, `deletedAt: null`, `timestamps: true` i `versionKey: false`.

---

### Ús 2 

**Prompt literal:**
> "Com faig la validació amb Joi per crear la pregunta, editar-la i afegir una resposta?"

**Resposta de la IA:**
Va generar tres esquemes de Joi: un per crear, un per editar i un altre per respondre.

**Incoherències detectades:**
A `create` i a `answer` demanava el camp `author` al body, però al nostre projecte l'autor surt del token JWT. A més, a l'update permetia canviar l'exercici.

**Solució/adaptació manual:**
Vaig treure el camp `author` de Joi perquè ve del token a través del middleware, i a `update` vaig deixar només modificar `title` i `text`.

---

### Ús 3 

**Prompt literal:**
> "Com defineixo a TypeScript les interfícies d'Angular per a Question i les seves respostes Answer?"

**Resposta de la IA:**
Va proposar les interfícies bàsiques de `Question` i `Answer` per al frontend.

**Incoherències detectades:**
Va posar `exercise: string` i `author: string` a la interfície de lectura, però al nostre backend fem `populate` i arriben els objectes sencers (`Exercise` i `UserSummary`).

**Solució/adaptació manual:**
Vaig canviar els camps de lectura a `Exercise` i `UserSummary`, i vaig crear `QuestionInput` amb strings només per quan s'envia el formulari.

---

### Ús 4 

**Prompt literal:**
> "Com faig la interfície de la resposta paginada i dels filtres pel llistat de preguntes?"

**Resposta de la IA:**
Va crear una interfície de paginació genèrica amb camps com `total` i `items`.

**Incoherències detectades:**
No aprofitava la interfície `PageInfo` ni `ListParams` que ja tenim creades al projecte a `page.model.ts`.

**Solució/adaptació manual:**
Vaig fer `QuestionsPage` utilitzant `PageInfo` com a `Exercise`, vaig crear `QuestionListParams` extenent `ListParams`, i ho vaig reexportar tot a `index.ts`.
