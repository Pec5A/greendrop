# Intégration MapCN - Documentation

## Installation

MapCN (basé sur MapLibre GL) a été intégré dans l'application pour offrir des cartes interactives sans nécessiter de clés API.

### Dépendances installées

```bash
pnpm add maplibre-gl
```

## Composants disponibles

Le fichier `components/ui/map.tsx` contient tous les composants de carte:

### 1. `Map` - Composant principal
```tsx
import { Map } from "@/components/ui/map"

<Map
  center={[2.3522, 48.8566]} // Paris par défaut
  zoom={12}
>
  {/* Vos composants de carte ici */}
</Map>
```

**Props:**
- `center`: `[longitude, latitude]` - Centre de la carte
- `zoom`: `number` - Niveau de zoom initial
- `className`: `string` - Classes CSS personnalisées
- `onMapLoad`: `(map: maplibregl.Map) => void` - Callback quand la carte est prête

### 2. `MapControls` - Contrôles de navigation
```tsx
<Map center={[2.3522, 48.8566]} zoom={12}>
  <MapControls />
</Map>
```

Ajoute automatiquement:
- Zoom +/-
- Boussole
- Géolocalisation
- Mode plein écran

### 3. `MapMarker` - Marqueurs personnalisables
```tsx
<MapMarker
  longitude={2.3522}
  latitude={48.8566}
  color="#10b981"
  onClick={() => console.log("Cliqué!")}
>
  {/* Contenu personnalisé (optionnel) */}
</MapMarker>
```

**Props:**
- `longitude`: `number` - Position X
- `latitude`: `number` - Position Y
- `color`: `string` - Couleur du marqueur (CSS)
- `onClick`: `() => void` - Action au clic
- `children`: `React.ReactNode` - Contenu personnalisé
- `className`: `string` - Classes CSS

### 4. `MapPopup` - Fenêtres contextuelles
```tsx
<MapPopup
  longitude={2.3522}
  latitude={48.8566}
  onClose={() => setShowPopup(false)}
  closeButton
>
  <div>
    <h3>Titre</h3>
    <p>Contenu</p>
  </div>
</MapPopup>
```

**Props:**
- `longitude`: `number`
- `latitude`: `number`
- `onClose`: `() => void`
- `closeButton`: `boolean` - Afficher le bouton de fermeture
- `closeOnClick`: `boolean` - Fermer au clic sur la carte
- `className`: `string`

### 5. `MapRoute` - Tracer des lignes/routes
```tsx
<MapRoute
  coordinates={[
    [2.3522, 48.8566],
    [2.3376, 48.8606],
  ]}
  color="#3b82f6"
  width={3}
  opacity={0.8}
/>
```

**Props:**
- `coordinates`: `[number, number][]` - Array de [lng, lat]
- `color`: `string` - Couleur de la ligne
- `width`: `number` - Épaisseur en pixels
- `opacity`: `number` - Opacité (0 à 1)

## Exemples d'utilisation

### Page Chauffeurs (app/drivers/page.tsx)

La page des chauffeurs intègre maintenant une vue carte interactive:

```tsx
// Vue avec onglets
<Tabs defaultValue="list">
  <TabsList>
    <TabsTrigger value="map">Carte</TabsTrigger>
    <TabsTrigger value="list">Liste</TabsTrigger>
  </TabsList>

  <TabsContent value="map">
    <Map center={[2.3522, 48.8566]} zoom={12}>
      <MapControls />
      
      {drivers.map((driver) => (
        <MapMarker
          key={driver.id}
          longitude={driver.location.lng}
          latitude={driver.location.lat}
          color={statusColors[driver.status]}
          onClick={() => setSelectedDriver(driver)}
        />
      ))}

      {selectedDriver && (
        <MapPopup
          longitude={selectedDriver.location.lng}
          latitude={selectedDriver.location.lat}
          onClose={() => setSelectedDriver(null)}
        >
          <DriverInfo driver={selectedDriver} />
        </MapPopup>
      )}
    </Map>
  </TabsContent>
</Tabs>
```

### Fonctionnalités implémentées

✅ **Carte interactive** des chauffeurs en temps réel  
✅ **Marqueurs colorés** selon le statut (en ligne/occupé/pause)  
✅ **Popups** avec informations détaillées du chauffeur  
✅ **Sidebar** listant les chauffeurs actifs  
✅ **Thème automatique** (clair/sombre)  
✅ **Contrôles de navigation** (zoom, géolocalisation, plein écran)  
✅ **Sans clé API** (utilise CARTO basemaps gratuits)

## Fonds de carte disponibles

MapCN utilise par défaut les tuiles CARTO gratuites:

- **Mode clair**: Positron (style épuré)
- **Mode sombre**: Dark Matter (optimisé pour la lisibilité)

Les tuiles changent automatiquement selon le thème de l'application.

### Autres fournisseurs supportés

Vous pouvez utiliser n'importe quelle source compatible MapLibre:

- **MapTiler** (clé API requise)
- **OpenStreetMap**
- **Stadia Maps**
- **Thunderforest**

## Performance

- **Léger**: MapLibre GL est ~40% plus petit que Mapbox GL
- **Rapide**: Rendu WebGL natif
- **Optimisé**: Clustering automatique pour grandes quantités de marqueurs

## Prochaines étapes

Suggestions d'implémentation:

1. **Page Commandes** (`/orders`)
   - Trajet de livraison avec `MapRoute`
   - Marqueurs pickup/dropoff
   - Suivi en temps réel

2. **Page Zones légales** (`/legal-zones`)
   - Dessin de polygones
   - Éditeur de zones interactif
   - Validation géographique

3. **Page Magasins** (`/shops`)
   - Carte de tous les commerces
   - Filtres par zone
   - Rayon de livraison visualisé

## Ressources

- [Documentation MapLibre GL](https://maplibre.org/maplibre-gl-js/docs/)
- [Repo MapCN](https://github.com/AnmolSaini16/mapcn)
- [CARTO Basemaps](https://carto.com/basemaps/)

## Support

Pour toute question ou problème:
1. Vérifier que `maplibre-gl` est installé
2. Vérifier que les données de localisation existent (`driver.location`)
3. Consulter la console pour erreurs MapLibre
