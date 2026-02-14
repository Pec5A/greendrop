# GreenDrop — Monitoring Grafana Cloud

## Architecture

```
Firebase Cloud Functions (push-metrics)
        │ every 5 min
        ▼
Grafana Cloud (Graphite endpoint)
        │
        ├── Dashboard KPIs (dashboard.json)
        │     ├── Commandes (total, aujourd'hui, par statut)
        │     ├── Revenu (total, journalier, évolution)
        │     ├── Chauffeurs (connectés, occupés)
        │     ├── Utilisateurs (total, vérifiés, nouveaux)
        │     ├── Vérifications KYC (pending/approved/rejected)
        │     ├── Disputes ouvertes
        │     └── Taux de livraison à temps
        │
        └── Alertes (alerts.yaml)
              ├── Taux de livraison < 80%  → Discord
              ├── Disputes > 10            → Discord
              ├── Vérifications KYC > 20   → Discord
              ├── 0 chauffeurs en ligne    → Discord
              └── Revenu = 0€ après 12h   → Discord
```

## Setup Grafana Cloud (gratuit)

### 1. Créer un compte

1. Aller sur https://grafana.com/products/cloud/
2. Créer un compte gratuit (10 000 metrics, 50 GB logs, 14 jours rétention)
3. Récupérer les informations de connexion :
   - **Graphite URL** : `https://graphite-prod-xx-xxx.grafana.net`
   - **User ID** : visible dans la page My Account
   - **API Key** : Grafana Cloud → API Keys → New API Key (role: MetricsPublisher)

### 2. Configurer Firebase

```bash
cd shared/functions

firebase functions:config:set \
  grafana.url="https://graphite-prod-xx-xxx.grafana.net" \
  grafana.user="YOUR_USER_ID" \
  grafana.api_key="YOUR_API_KEY"

firebase deploy --only functions:pushMetrics
```

### 3. Importer le dashboard

1. Grafana Cloud → Dashboards → Import
2. Charger `dashboard.json`
3. Sélectionner la datasource Graphite

### 4. Configurer les alertes

#### Contact point Discord

1. Grafana → Alerting → Contact points → New
2. Type: **Discord**
3. Webhook URL: `https://discord.com/api/webhooks/<id>/<token>`
4. Sauvegarder

#### Importer les règles

1. Grafana → Alerting → Alert rules
2. Créer les règles selon `alerts.yaml`

Ou via l'API :
```bash
curl -X POST https://your-stack.grafana.net/api/v1/provisioning/alert-rules \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @alerts.yaml
```

## Métriques collectées

| Métrique | Description | Type |
|----------|-------------|------|
| `greendrop.orders.total` | Nombre total de commandes | Gauge |
| `greendrop.orders.today` | Commandes du jour | Gauge |
| `greendrop.orders.revenue.total` | Revenu cumulé (€) | Gauge |
| `greendrop.orders.revenue.today` | Revenu du jour (€) | Gauge |
| `greendrop.orders.status.*` | Commandes par statut | Gauge |
| `greendrop.orders.on_time_rate` | Taux de livraison à temps (%) | Gauge |
| `greendrop.users.total` | Utilisateurs totaux | Gauge |
| `greendrop.users.verified` | Utilisateurs vérifiés | Gauge |
| `greendrop.users.new_today` | Nouveaux utilisateurs du jour | Gauge |
| `greendrop.drivers.total` | Chauffeurs totaux | Gauge |
| `greendrop.drivers.online` | Chauffeurs connectés | Gauge |
| `greendrop.drivers.busy` | Chauffeurs en course | Gauge |
| `greendrop.verifications.pending` | Vérifications en attente | Gauge |
| `greendrop.verifications.approved` | Vérifications approuvées | Gauge |
| `greendrop.verifications.rejected` | Vérifications rejetées | Gauge |
| `greendrop.disputes.open` | Disputes ouvertes | Gauge |
| `greendrop.shops.total` | Boutiques actives | Gauge |
