Remplacer la police des labels et états gris (actuellement Space Grotesk) par Sora Light.

**Modifications prévues :**

1. **Chargement de la police** — dans `src/routes/__root.tsx`, ajouter Sora Light au lien Google Fonts (`family=Sora:wght@300` ou équivalent) tout en conservant Inter.
2. **Token de police** — dans `src/styles.css`, remplacer la valeur de `--font-label` par `"Sora", ui-sans-serif, ...` et ajuster le commentaire d'intro pour refléter Sora Light à la place de Space Grotesk.
3. **Poids par défaut** — s'assurer que l'utilitaire `font-label` utilise bien le poids 300 (light) par défaut, soit via `font-weight: 300` dans `@utility font-label`, soit en combinant `font-label font-light` là où c'est pertinent.

**Fichiers concernés :**
- `src/routes/__root.tsx`
- `src/styles.css`

**Résultat attendu :** tous les textes de labels et de statuts gris (classe `font-label` / `text-muted-foreground`) s'affichent en Sora Light au lieu de Space Grotesk.