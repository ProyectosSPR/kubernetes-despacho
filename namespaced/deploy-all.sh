#!/bin/bash
# Script maestro para desplegar toda la infraestructura con namespaces
# Uso: ./deploy-all.sh

set -e  # Salir si hay error

echo "========================================="
echo "DESPLIEGUE COMPLETO CON NAMESPACES"
echo "========================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para preguntar confirmación
confirm() {
    read -p "$1 (y/n): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# 1. Crear namespaces
echo -e "${YELLOW}Paso 1: Creando namespaces...${NC}"
kubectl apply -f 00-namespaces/namespaces.yaml
echo -e "${GREEN}✓ Namespaces creados${NC}"
echo ""

# 2. Desplegar infrastructure (CRÍTICO - debe ir primero)
echo -e "${YELLOW}Paso 2: Desplegando INFRASTRUCTURE (Postgres, Redis, pgAdmin)...${NC}"
if confirm "¿Continuar con infrastructure?"; then
    kubectl apply -f 01-infrastructure/
    echo -e "${GREEN}✓ Infrastructure desplegado${NC}"
    echo "Esperando a que Postgres esté listo..."
    kubectl wait --for=condition=ready pod -l app=postgres -n infrastructure --timeout=300s
    echo -e "${GREEN}✓ Postgres está listo${NC}"
else
    echo "Saltando infrastructure..."
fi
echo ""

# 3. Desplegar AutomateAI
echo -e "${YELLOW}Paso 3: Desplegando AUTOMATEAI (n8n_aut, odoo18, odoo19, autodoo19, evolution)...${NC}"
if confirm "¿Continuar con AutomateAI?"; then
    kubectl apply -f 02-automateai/
    echo -e "${GREEN}✓ AutomateAI desplegado${NC}"
else
    echo "Saltando AutomateAI..."
fi
echo ""

# 4. Desplegar DML
echo -e "${YELLOW}Paso 4: Desplegando DML (n8n, odoo16, odoo16-prod, facturacion)...${NC}"
if confirm "¿Continuar con DML?"; then
    kubectl apply -f 03-dml/
    echo -e "${GREEN}✓ DML desplegado${NC}"
else
    echo "Saltando DML..."
fi
echo ""

# 5. Desplegar Shared
echo -e "${YELLOW}Paso 5: Desplegando SHARED (metabase, npm, cloudflare, ngrok)...${NC}"
if confirm "¿Continuar con SHARED?"; then
    kubectl apply -f 04-shared/
    echo -e "${GREEN}✓ Shared desplegado${NC}"
else
    echo "Saltando Shared..."
fi
echo ""

# Resumen final
echo "========================================="
echo -e "${GREEN}DESPLIEGUE COMPLETADO${NC}"
echo "========================================="
echo ""
echo "Ver pods por namespace:"
echo "  kubectl get pods -n infrastructure"
echo "  kubectl get pods -n automateai"
echo "  kubectl get pods -n dml"
echo "  kubectl get pods -n shared"
echo ""
echo "Ver servicios:"
echo "  kubectl get svc -A"
