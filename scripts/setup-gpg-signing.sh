#!/bin/bash
# ─────────────────────────────────────────────────────────────
# GreenDrop — Script de configuration GPG + signature des commits
# ─────────────────────────────────────────────────────────────
# Usage: ./scripts/setup-gpg-signing.sh
#
# Ce script :
#   1. Installe GPG si absent
#   2. Génère une clé GPG avec ton email git
#   3. Configure git pour signer automatiquement
#   4. Affiche la clé publique à ajouter sur GitHub
#   5. Rebase tous tes commits pour les signer
# ─────────────────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  GreenDrop — Configuration GPG Commit Signing${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── 1. Vérifier / installer GPG ──────────────────────────────
echo -e "${BLUE}[1/6]${NC} Vérification de GPG..."
if ! command -v gpg &> /dev/null; then
    echo -e "${YELLOW}GPG non trouvé. Installation via Homebrew...${NC}"
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}Erreur : Homebrew requis. Installe-le : https://brew.sh${NC}"
        exit 1
    fi
    brew install gnupg
    echo -e "${GREEN}GPG installé.${NC}"
else
    echo -e "${GREEN}GPG déjà installé : $(gpg --version | head -1)${NC}"
fi

# ── 2. Récupérer l'email git ─────────────────────────────────
echo ""
echo -e "${BLUE}[2/6]${NC} Récupération de ton email git..."
GIT_EMAIL=$(git config user.email)
GIT_NAME=$(git config user.name)

if [ -z "$GIT_EMAIL" ]; then
    echo -e "${YELLOW}Aucun email git configuré.${NC}"
    read -p "Entre ton email (le même que sur GitHub) : " GIT_EMAIL
    git config --global user.email "$GIT_EMAIL"
fi

if [ -z "$GIT_NAME" ]; then
    read -p "Entre ton nom : " GIT_NAME
    git config --global user.name "$GIT_NAME"
fi

echo -e "${GREEN}Nom  : ${GIT_NAME}${NC}"
echo -e "${GREEN}Email: ${GIT_EMAIL}${NC}"

# ── 3. Vérifier si une clé GPG existe déjà ───────────────────
echo ""
echo -e "${BLUE}[3/6]${NC} Vérification des clés GPG existantes..."
EXISTING_KEY=$(gpg --list-secret-keys --keyid-format=long "$GIT_EMAIL" 2>/dev/null | grep "sec" | head -1 | sed 's/.*\/\([A-F0-9]*\).*/\1/' || true)

if [ -n "$EXISTING_KEY" ]; then
    echo -e "${GREEN}Clé GPG existante trouvée : ${EXISTING_KEY}${NC}"
    KEY_ID="$EXISTING_KEY"
else
    echo -e "${YELLOW}Aucune clé trouvée. Génération d'une nouvelle clé...${NC}"
    echo ""

    # Génération batch (non-interactive)
    gpg --batch --gen-key <<EOF
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: ${GIT_NAME}
Name-Email: ${GIT_EMAIL}
Expire-Date: 0
%no-protection
%commit
EOF

    KEY_ID=$(gpg --list-secret-keys --keyid-format=long "$GIT_EMAIL" 2>/dev/null | grep "sec" | head -1 | sed 's/.*\/\([A-F0-9]*\).*/\1/')

    if [ -z "$KEY_ID" ]; then
        echo -e "${RED}Erreur : impossible de générer la clé GPG.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Clé GPG générée : ${KEY_ID}${NC}"
fi

# ── 4. Configurer git ─────────────────────────────────────────
echo ""
echo -e "${BLUE}[4/6]${NC} Configuration de git pour la signature automatique..."
git config --global user.signingkey "$KEY_ID"
git config --global commit.gpgsign true
git config --global gpg.program "$(which gpg)"
echo -e "${GREEN}Git configuré pour signer tous les commits avec ${KEY_ID}${NC}"

# ── 5. Afficher la clé publique pour GitHub ───────────────────
echo ""
echo -e "${BLUE}[5/6]${NC} Clé publique à ajouter sur GitHub :"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
gpg --armor --export "$KEY_ID"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Copie la clé ci-dessus (de -----BEGIN à -----END) et colle-la sur :${NC}"
echo -e "${BLUE}  https://github.com/settings/gpg/new${NC}"
echo ""
read -p "Appuie sur Entrée une fois la clé ajoutée sur GitHub..."

# ── 6. Signer les commits ────────────────────────────────────
echo ""
echo -e "${BLUE}[6/6]${NC} Signature de tes commits dans le repo..."
echo ""
echo -e "${YELLOW}ATTENTION : Cela va rebase tous les commits pour les signer.${NC}"
echo -e "${YELLOW}Un force push sera nécessaire après.${NC}"
echo ""
read -p "Continuer ? (o/N) : " CONFIRM

if [[ "$CONFIRM" != "o" && "$CONFIRM" != "O" && "$CONFIRM" != "oui" ]]; then
    echo -e "${YELLOW}Annulé. Tes futurs commits seront signés automatiquement.${NC}"
    echo -e "${GREEN}Configuration terminée !${NC}"
    exit 0
fi

MY_EMAIL="$GIT_EMAIL"
echo -e "${BLUE}Rebase en cours... (signe uniquement les commits de ${MY_EMAIL})${NC}"

git -c commit.gpgsign=false rebase --root --exec "AE=\$(git log -1 --format='%ae'); AN=\$(git log -1 --format='%an'); AD=\$(git log -1 --format='%aI'); if [ \"\$AE\" = \"${MY_EMAIL}\" ]; then GIT_COMMITTER_NAME=\"\$AN\" GIT_COMMITTER_EMAIL=\"\$AE\" GIT_COMMITTER_DATE=\"\$AD\" git -c commit.gpgsign=false commit --amend --no-edit -S; else GIT_COMMITTER_NAME=\"\$AN\" GIT_COMMITTER_EMAIL=\"\$AE\" GIT_COMMITTER_DATE=\"\$AD\" git -c commit.gpgsign=false commit --amend --no-edit; fi"

echo ""
echo -e "${GREEN}Tous tes commits sont maintenant signés !${NC}"
echo ""
echo -e "${YELLOW}Dernière étape : force push${NC}"
read -p "Force push maintenant ? (o/N) : " PUSH_CONFIRM

if [[ "$PUSH_CONFIRM" == "o" || "$PUSH_CONFIRM" == "O" || "$PUSH_CONFIRM" == "oui" ]]; then
    git push --force-with-lease
    echo -e "${GREEN}Push terminé !${NC}"
else
    echo -e "${YELLOW}N'oublie pas de faire : git push --force-with-lease${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Terminé ! Tes commits sont signés.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
