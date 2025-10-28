# Guía Completa: Instalación de Clúster Kubernetes con Tailscale

## Requisitos Previos
- Ubuntu 22.04 LTS (o compatible)
- Acceso root o sudo
- Conexión a internet
- Mínimo 2 CPU y 2GB RAM por nodo
- Conectividad entre nodos (vía Tailscale)

---

# PARTE A: INSTALACIÓN DEL NODO MASTER (Control Plane)

## 1. Preparación del Sistema del Master

### 1.1 Actualizar el sistema
**[EJECUTAR EN MASTER]**
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 1.2 Deshabilitar swap
**[EJECUTAR EN MASTER]**
```bash
# Deshabilitar swap temporalmente
sudo swapoff -a

# Deshabilitar swap permanentemente
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

### 1.3 Cargar módulos del kernel necesarios
**[EJECUTAR EN MASTER]**
```bash
# Cargar módulos
sudo modprobe overlay
sudo modprobe br_netfilter

# Hacer que se carguen automáticamente al iniciar
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```

### 1.4 Configurar parámetros de sysctl
**[EJECUTAR EN MASTER]**
```bash
# Configurar parámetros de red
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

# Aplicar los parámetros
sudo sysctl --system
```

## 2. Instalar Container Runtime (containerd) en Master

**[EJECUTAR EN MASTER]**
```bash
# Instalar Docker y containerd
sudo apt-get update
sudo apt-get install -y docker.io containerd

# Configurar containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Reiniciar containerd
sudo systemctl restart containerd
sudo systemctl enable containerd
```

## 3. Instalar Herramientas de Kubernetes en Master

### 3.1 Agregar repositorio de Kubernetes
**[EJECUTAR EN MASTER]**
```bash
# Instalar paquetes necesarios
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl

# Agregar la llave GPG de Kubernetes
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# Agregar el repositorio
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
```

### 3.2 Instalar kubelet, kubeadm y kubectl
**[EJECUTAR EN MASTER]**
```bash
# Actualizar lista de paquetes
sudo apt-get update

# Instalar los paquetes
sudo apt-get install -y kubelet kubeadm kubectl

# Prevenir actualizaciones automáticas
sudo apt-mark hold kubelet kubeadm kubectl
```

## 4. Instalar y Configurar Tailscale en Master

### 4.1 Instalar Tailscale
**[EJECUTAR EN MASTER]**
```bash
# Instalar Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
```

### 4.2 Autenticar Tailscale
**[EJECUTAR EN MASTER]**
```bash
# Iniciar y autenticar Tailscale
sudo tailscale up

# Seguir las instrucciones para autenticar (abrir el enlace en un navegador)
```

### 4.3 Verificar la IP de Tailscale
**[EJECUTAR EN MASTER]**
```bash
# Obtener la IP asignada por Tailscale
tailscale ip -4
# IMPORTANTE: Anota esta IP, la necesitarás para la configuración
```

## 5. Inicializar el Clúster Kubernetes

### 5.1 Crear archivo de configuración para kubeadm
**[EJECUTAR EN MASTER]**

Primero, obtén las IPs necesarias:
```bash
# IP local del master
hostname -I | awk '{print $1}'

# IP de Tailscale del master
tailscale ip -4
```

Ahora crea el archivo de configuración (reemplaza las IPs con las tuyas):

```bash
cat <<EOF | sudo tee /tmp/kubeadm-init-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: "100.73.223.72"  # Reemplazar con tu IP de Tailscale
  bindPort: 6443
nodeRegistration:
  kubeletExtraArgs:
    node-ip: "100.73.223.72"  # Reemplazar con tu IP de Tailscale
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
networking:
  podSubnet: "10.244.0.0/16"  # Para Flannel CNI
apiServer:
  certSANs:
  - "192.168.80.8"      # Reemplazar con tu IP local
  - "100.73.223.72"     # Reemplazar con tu IP de Tailscale
  - "10.96.0.1"
  - "localhost"
  - "kubernetes"
  - "kubernetes.default"
  - "kubernetes.default.svc"
  - "kubernetes.default.svc.cluster.local"
  extraArgs:
    advertise-address: "100.73.223.72"  # Reemplazar con tu IP de Tailscale
EOF
```

### 5.2 Inicializar el clúster
**[EJECUTAR EN MASTER]**
```bash
# Inicializar el clúster con la configuración
sudo kubeadm init --config=/tmp/kubeadm-init-config.yaml
```

### 5.3 Configurar kubectl para el usuario
**[EJECUTAR EN MASTER]**
```bash
# Configurar kubectl para el usuario actual
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Verificar que funcione
kubectl get nodes
```

## 6. Instalar un Plugin de Red (CNI)

### 6.1 Instalar Flannel (recomendado para Tailscale)
**[EJECUTAR EN MASTER]**
```bash
# Aplicar el manifiesto de Flannel
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

# Verificar que los pods estén corriendo
kubectl get pods -n kube-flannel
```

### 6.2 Esperar a que el nodo master esté listo
**[EJECUTAR EN MASTER]**
```bash
# Ver el estado del nodo
kubectl get nodes

# Ver todos los pods del sistema
kubectl get pods -n kube-system
```

## 7. Configurar kubelet para usar siempre Tailscale
**[EJECUTAR EN MASTER]**
```bash
# Configurar kubelet para usar la IP de Tailscale permanentemente
echo "KUBELET_EXTRA_ARGS=--node-ip=$(tailscale ip -4)" | sudo tee /etc/default/kubelet

# Reiniciar kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

---

# PARTE B: AGREGAR NODOS WORKER

## 1. Preparación del Sistema

### 1.1 Actualizar el sistema
**[EJECUTAR EN WORKER]**
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 1.2 Deshabilitar swap
**[EJECUTAR EN WORKER]**
```bash
# Deshabilitar swap temporalmente
sudo swapoff -a

# Deshabilitar swap permanentemente
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
```

### 1.3 Cargar módulos del kernel necesarios
**[EJECUTAR EN WORKER]**
```bash
# Cargar módulos
sudo modprobe overlay
sudo modprobe br_netfilter

# Hacer que se carguen automáticamente al iniciar
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```

### 1.4 Configurar parámetros de sysctl
**[EJECUTAR EN WORKER]**
```bash
# Configurar parámetros de red
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

# Aplicar los parámetros
sudo sysctl --system
```

## 2. Instalar Container Runtime (containerd) en Worker

**[EJECUTAR EN WORKER]**

```bash
# Instalar Docker y containerd
sudo apt-get update
sudo apt-get install -y docker.io containerd

# Configurar containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Reiniciar containerd
sudo systemctl restart containerd
sudo systemctl enable containerd
```

## 3. Instalar Herramientas de Kubernetes en Worker

### 3.1 Agregar repositorio de Kubernetes
**[EJECUTAR EN WORKER]**
```bash
# Instalar paquetes necesarios
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl

# Agregar la llave GPG de Kubernetes
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# Agregar el repositorio
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
```

### 3.2 Instalar kubelet, kubeadm y kubectl
**[EJECUTAR EN WORKER]**
```bash
# Actualizar lista de paquetes
sudo apt-get update

# Instalar los paquetes
sudo apt-get install -y kubelet kubeadm kubectl

# Prevenir actualizaciones automáticas
sudo apt-mark hold kubelet kubeadm kubectl
```

## 4. Instalar y Configurar Tailscale en Worker

### 4.1 Instalar Tailscale
**[EJECUTAR EN WORKER]**
```bash
# Instalar Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
```

### 4.2 Autenticar Tailscale
**[EJECUTAR EN WORKER]**
```bash
# Iniciar y autenticar Tailscale
sudo tailscale up

# Seguir las instrucciones para autenticar (abrir el enlace en un navegador)
```

### 4.3 Verificar la IP de Tailscale
**[EJECUTAR EN WORKER]**
```bash
# Obtener la IP asignada por Tailscale
tailscale ip -4
# Anota esta IP, la necesitarás más adelante
```

## 5. Configurar kubelet para usar Tailscale en Worker

**[EJECUTAR EN WORKER]**
```bash
# Configurar kubelet para usar la IP de Tailscale
echo "KUBELET_EXTRA_ARGS=--node-ip=$(tailscale ip -4)" | sudo tee /etc/default/kubelet

# Reiniciar kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

## 6. Obtener el Comando Join del Master

### 6.1 Generar token de unión
**[EJECUTAR EN MASTER]**
```bash
# Generar un nuevo token de unión (válido por 24 horas)
kubeadm token create --print-join-command
```

Esto generará un comando similar a:
```
kubeadm join 192.168.x.x:6443 --token xxxxx.xxxxxxxxxxxxxxx --discovery-token-ca-cert-hash sha256:xxxxxxxx
```

### 6.2 Obtener la IP de Tailscale del master:
**[EJECUTAR EN MASTER]**
```bash
# Obtener IP de Tailscale del master
tailscale ip -4
```

## 7. Unir el Worker al Clúster

### 7.1 Modificar y ejecutar el comando join
**[EJECUTAR EN WORKER]**

En el nuevo nodo worker, ejecuta el comando join pero **reemplaza la IP del master con su IP de Tailscale**:

```bash
# Ejemplo: Si la IP de Tailscale del master es 100.73.223.72
sudo kubeadm join 100.73.223.72:6443 --token xxxxx.xxxxxxxxxxxxxxx --discovery-token-ca-cert-hash sha256:xxxxxxxx
```

### 7.2 Esperar a que complete
El proceso puede tomar varios minutos mientras:
- Descarga las imágenes necesarias
- Configura los certificados
- Se une al clúster

## 8. Verificación

### 8.1 Verificar desde el master
**[EJECUTAR EN MASTER]**
```bash
# Ver todos los nodos
kubectl get nodes

# Ver más detalles incluyendo IPs
kubectl get nodes -o wide
```

El nuevo nodo debería aparecer inicialmente como "NotReady" y después de unos minutos cambiar a "Ready".

## Solución de Problemas Comunes

### Error: "certificate is valid for X, not Y"
**Problema**: El certificado del API server no incluye la IP de Tailscale del master.

**Solución [EJECUTAR EN MASTER]**:
```bash
# Crear archivo de configuración
cat <<EOF | sudo tee /tmp/kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
apiServer:
  certSANs:
  - "192.168.80.8"      # IP local del master
  - "100.73.223.72"     # IP de Tailscale del master (cambiar por la real)
  - "10.96.0.1"
  - "kubernetes"
  - "kubernetes.default"
  - "kubernetes.default.svc"
  - "kubernetes.default.svc.cluster.local"
  extraArgs:
    advertise-address: "100.73.223.72"  # IP de Tailscale del master
EOF

# Backup de certificados
sudo cp -r /etc/kubernetes/pki /etc/kubernetes/pki.backup

# Eliminar certificados del API server
sudo rm /etc/kubernetes/pki/apiserver.{crt,key}

# Regenerar certificados
sudo kubeadm init phase certs apiserver --config=/tmp/kubeadm-config.yaml

# Reiniciar kubelet
sudo systemctl restart kubelet
```

### Error: "kubelet service is not running"
**[EJECUTAR EN EL NODO AFECTADO]**
```bash
# Verificar logs de kubelet
sudo journalctl -xeu kubelet -f

# Reiniciar kubelet
sudo systemctl stop kubelet
sudo systemctl start kubelet
```

### Error: "bridge-nf-call-iptables does not exist"
**[EJECUTAR EN EL NODO AFECTADO]**
```bash
# Cargar módulo br_netfilter
sudo modprobe br_netfilter

# Verificar
lsmod | grep br_netfilter
```

### Nodo queda en estado "NotReady"
**[EJECUTAR EN MASTER]**
```bash
# Verificar pods del sistema
kubectl get pods -n kube-system

# Verificar logs del nodo
kubectl describe node <nombre-del-nodo>
```

## Comandos Útiles

### Ver logs en tiempo real
**[EJECUTAR EN EL NODO QUE NECESITA DIAGNÓSTICO]**
```bash
# Ver logs de kubelet
sudo journalctl -xeu kubelet -f

# Ver logs de kubeadm con más detalle
sudo kubeadm join <ip>:6443 --token <token> --discovery-token-ca-cert-hash <hash> -v=5
```

### Limpiar un nodo (si necesitas reintentar)
**[EJECUTAR EN WORKER]**
```bash
# Resetear kubeadm
sudo kubeadm reset
sudo rm -rf /etc/cni/net.d
sudo rm -rf /var/lib/kubelet
sudo systemctl restart kubelet
```

### Generar nuevo token (si el anterior expiró)
**[EJECUTAR EN MASTER]**
```bash
# Generar nuevo token
kubeadm token create --print-join-command
```

### Eliminar un nodo del clúster
**[EJECUTAR EN MASTER]**
```bash
# Marcar el nodo como no programable
kubectl cordon <nombre-del-nodo>

# Drenar el nodo (mover pods a otros nodos)
kubectl drain <nombre-del-nodo> --ignore-daemonsets --delete-emptydir-data

# Eliminar el nodo del clúster
kubectl delete node <nombre-del-nodo>
```

Luego **[EJECUTAR EN EL NODO A ELIMINAR]**:
```bash
# Limpiar la configuración de kubeadm
sudo kubeadm reset
```

## Notas Importantes

1. **Seguridad**: Asegúrate de que Tailscale esté correctamente configurado y que solo los nodos autorizados puedan unirse a tu red.

2. **Firewall**: Si tienes firewall activo, asegúrate de permitir el tráfico necesario:
   - Puerto 6443: API server
   - Puerto 10250: Kubelet
   - Puertos 30000-32767: NodePort services

3. **Versiones**: Esta guía usa Kubernetes 1.28. Ajusta según tu versión.

4. **Persistencia**: Los cambios en `/etc/default/kubelet` y la deshabilitación del swap persisten después de reiniciar.

## Resumen del Proceso

### Para el Master:
1. Preparar el sistema (swap, módulos, sysctl)
2. Instalar container runtime (containerd)
3. Instalar herramientas de Kubernetes
4. Instalar y configurar Tailscale
5. Inicializar el clúster con kubeadm (incluyendo IP de Tailscale en certificados)
6. Instalar CNI (Flannel)
7. Configurar kubectl

### Para Workers:
1. Preparar el sistema (swap, módulos, sysctl)
2. Instalar container runtime (containerd)
3. Instalar herramientas de Kubernetes
4. Instalar y configurar Tailscale
5. Configurar kubelet para usar IP de Tailscale
6. Obtener comando join del master (con IP de Tailscale)
7. Ejecutar join en el worker
8. Verificar en el master

## Verificación Final

**[EJECUTAR EN MASTER]**
```bash
# Ver todos los nodos con sus IPs
kubectl get nodes -o wide

# Ver todos los pods del sistema
kubectl get pods -n kube-system

# Ver información detallada del clúster
kubectl cluster-info
```

¡Tu clúster Kubernetes con Tailscale está listo para usar!