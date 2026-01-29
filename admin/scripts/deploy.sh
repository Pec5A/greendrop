#!/bin/bash

# ==================================================
# Script de déploiement GreenDrop
# ==================================================
# Ce script automatise le déploiement Firebase
# Usage: ./scripts/deploy.sh [options]
# ==================================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'aide
print_help() {
    echo "Usage: ./scripts/deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  --all         Déployer tout (rules, indexes, seed)"
    echo "  --rules       Déployer uniquement les règles Firestore"
    echo "  --indexes     Déployer uniquement les index Firestore"
    echo "  --seed        Exécuter le script de seed"
    echo "  --check       Vérifier la configuration sans déployer"
    echo "  --help        Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  ./scripts/deploy.sh --all"
    echo "  ./scripts/deploy.sh --rules --indexes"
}

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que Firebase CLI est installé
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        log_error "Firebase CLI n'est pas installé"
        echo "Installez-le avec: npm install -g firebase-tools"
        exit 1
    fi
    log_success "Firebase CLI trouvé"
}

# Vérifier la connexion Firebase
check_firebase_login() {
    if ! firebase projects:list &> /dev/null; then
        log_warning "Non connecté à Firebase"
        log_info "Lancement de la connexion..."
        firebase login
    fi
    log_success "Connecté à Firebase"
}

# Vérifier le projet Firebase
check_firebase_project() {
    local project=$(firebase use 2>&1)
    if [[ $project == *"No project"* ]]; then
        log_error "Aucun projet Firebase sélectionné"
        echo "Configurez le projet avec: firebase use <project-id>"
        exit 1
    fi
    log_success "Projet Firebase: $(firebase use)"
}

# Déployer les règles Firestore
deploy_rules() {
    log_info "Déploiement des règles Firestore..."
    firebase deploy --only firestore:rules
    log_success "Règles Firestore déployées"
}

# Déployer les index Firestore
deploy_indexes() {
    log_info "Déploiement des index Firestore..."
    firebase deploy --only firestore:indexes
    log_success "Index Firestore déployés"
}

# Exécuter le seed
run_seed() {
    log_info "Exécution du script de seed..."

    # Vérifier que le fichier .env.local existe
    if [ ! -f ".env.local" ]; then
        log_warning "Fichier .env.local non trouvé"
        log_info "Création à partir de .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            log_warning "Veuillez configurer les variables dans .env.local"
            exit 1
        else
            log_error "Fichier .env.example non trouvé"
            exit 1
        fi
    fi

    pnpm seed
    log_success "Données de démo créées"
}

# Vérification complète
check_all() {
    echo ""
    echo "======================================"
    echo "  Vérification de la configuration"
    echo "======================================"
    echo ""

    check_firebase_cli
    check_firebase_login
    check_firebase_project

    # Vérifier les fichiers nécessaires
    echo ""
    log_info "Vérification des fichiers..."

    files=("firebase.json" ".firebaserc" "firestore.rules" "firestore.indexes.json")
    all_found=true

    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
        else
            echo -e "  ${RED}✗${NC} $file (manquant)"
            all_found=false
        fi
    done

    if [ "$all_found" = true ]; then
        log_success "Tous les fichiers nécessaires sont présents"
    else
        log_error "Certains fichiers sont manquants"
        exit 1
    fi

    echo ""
    log_success "Configuration OK - Prêt pour le déploiement"
}

# Déployer tout
deploy_all() {
    echo ""
    echo "======================================"
    echo "  Déploiement complet GreenDrop"
    echo "======================================"
    echo ""

    check_firebase_cli
    check_firebase_login
    check_firebase_project

    echo ""
    deploy_rules
    echo ""
    deploy_indexes
    echo ""

    read -p "Voulez-vous exécuter le seed des données de démo? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_seed
    fi

    echo ""
    echo "======================================"
    log_success "Déploiement terminé!"
    echo "======================================"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. Vérifiez Firebase Console: https://console.firebase.google.com"
    echo "  2. Déployez sur Vercel (push sur main ou vercel --prod)"
    echo "  3. Testez l'application en production"
    echo ""
}

# Parser les arguments
if [ $# -eq 0 ]; then
    print_help
    exit 0
fi

DEPLOY_RULES=false
DEPLOY_INDEXES=false
RUN_SEED=false
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            DEPLOY_RULES=true
            DEPLOY_INDEXES=true
            RUN_SEED=true
            shift
            ;;
        --rules)
            DEPLOY_RULES=true
            shift
            ;;
        --indexes)
            DEPLOY_INDEXES=true
            shift
            ;;
        --seed)
            RUN_SEED=true
            shift
            ;;
        --check)
            CHECK_ONLY=true
            shift
            ;;
        --help|-h)
            print_help
            exit 0
            ;;
        *)
            log_error "Option inconnue: $1"
            print_help
            exit 1
            ;;
    esac
done

# Exécution
if [ "$CHECK_ONLY" = true ]; then
    check_all
    exit 0
fi

# Vérifications préalables
check_firebase_cli
check_firebase_login
check_firebase_project

echo ""

if [ "$DEPLOY_RULES" = true ]; then
    deploy_rules
    echo ""
fi

if [ "$DEPLOY_INDEXES" = true ]; then
    deploy_indexes
    echo ""
fi

if [ "$RUN_SEED" = true ]; then
    run_seed
    echo ""
fi

log_success "Opérations terminées!"
