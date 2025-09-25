# Guía Definitiva: Instalación y Configuración Completa de Kubeadm en Ubuntu

Esta guía documenta el proceso completo para instalar un clúster de Kubernetes de un solo nodo usando `kubeadm` en Ubuntu. Incluye los pasos de preparación, la instalación, la configuración de red (CNI), la configuración de almacenamiento dinámico, la resolución de problemas de conectividad externa y el acceso remoto.

---
## Fase 1: Preparación del Sistema (Prerequisitos)

El primer paso es asegurar que el sistema operativo base tenga las herramientas necesarias y la configuración correcta para ejecutar Kubernetes.

### 1.1 Instalar Herramientas Básicas (`curl`)
Se necesita `curl` para descargar claves de repositorios y otros archivos.

```bash
sudo apt-get update
sudo apt-get install -y curl
Error Encontrado: No se ha encontrado la orden «curl».

Solución: Se solucionó ejecutando el comando de instalación anterior.

1.2 Deshabilitar la Swap
Kubernetes requiere que el área de intercambio (swap) esté deshabilitada.

Bash

# Deshabilitar para la sesión actual
sudo swapoff -a

# Deshabilitar permanentemente editando fstab
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
1.3 Configurar Módulos del Kernel y Red
Se habilitan módulos para el networking de contenedores y se permite el reenvío de paquetes IP.

Bash

# Cargar módulos
sudo modprobe overlay
sudo modprobe br_netfilter

# Configurar para que persistan tras reinicios
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

# Aplicar configuraciones de red para Kubernetes
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Aplicar cambios
sudo sysctl --system
Fase 2: Instalación del Entorno de Contenedores (Containerd)
Kubernetes necesita un entorno de ejecución de contenedores. Usamos containerd.

2.1 Instalar containerd
Bash

sudo apt-get install -y containerd
2.2 Configurar containerd
Se genera un archivo de configuración y se modifica para usar el driver de cgroups de systemd, recomendado por kubelet.

Bash

# Crear directorio y generar config
sudo mkdir -p /etc/containerd
sudo containerd config default | sudo tee /etc/containerd/config.toml

# Habilitar el cgroup driver de systemd
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
2.3 Solución de Error: sandbox image inconsistent
Durante la inicialización, kubeadm puede advertir sobre una versión incorrecta de la imagen pause.

Error Encontrado: W... detected that the sandbox image "registry.k8s.io/pause:3.8" ... is inconsistent with ... "registry.k8s.io/pause:3.9"

Solución: Editar la configuración de containerd para especificar la versión correcta de la imagen pause y reiniciar el servicio.

Bash

# Editar el archivo
sudo nano /etc/containerd/config.toml

# Dentro del archivo, en la sección [plugins."io.containerd.grpc.v1.cri"], cambiar la línea:
# sandbox_image = "registry.k8s.io/pause:3.8"
# A:
# sandbox_image = "registry.k8s.io/pause:3.9"

# Reiniciar containerd para aplicar los cambios
sudo systemctl restart containerd
Fase 3: Instalación de las Herramientas de Kubernetes
Se instalan kubeadm, kubelet y kubectl desde los repositorios oficiales de Kubernetes.

Bash

# Instalar dependencias
sudo apt-get install -y apt-transport-https ca-certificates gpg

# Añadir la clave GPG del repositorio de Kubernetes
curl -fsSL [https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key](https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key) | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# Añadir el repositorio de Kubernetes
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] [https://pkgs.k8s.io/core:/stable:/v1.30/deb/](https://pkgs.k8s.io/core:/stable:/v1.30/deb/) /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Instalar las herramientas
sudo apt-get update
sudo apt-get install -y kubeadm kubelet kubectl

# (Opcional) Evitar actualizaciones automáticas
sudo apt-mark hold kubelet kubeadm kubectl
Fase 4: Inicialización del Clúster y Depuración de Red (CNI)
Este es el paso más crítico donde se crea el clúster y se configura la red de los pods.

4.1 Inicializar el Control-Plane
El flag --pod-network-cidr es crucial para que el plugin de red (CNI) sepa qué rango de IPs usar.

Bash

# Si hubo un intento fallido, limpiar primero
sudo kubeadm reset --force

# Inicializar el clúster
sudo kubeadm init --pod-network-cidr=192.168.0.0/16
4.2 Error: Pods de CoreDNS en estado Pending
Tras la inicialización, los pods del DNS del clúster no arrancaban.

Síntoma: kubectl get pods -A mostraba los pods de coredns como Pending.

Causa: Faltaba un plugin de red (CNI) que gestionara la red de los pods.

Solución: Instalar un CNI. En nuestro caso, elegimos Calico.

Bash

kubectl apply -f [https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml](https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml)
4.3 Error: Pods de Calico en estado Init o Pending
Después de instalar Calico, sus propios pods no se iniciaban correctamente.

Síntoma: kubectl get pods -A mostraba calico-node como Init:0/3.

Diagnóstico: Usamos kubectl describe pod <nombre-pod-calico> -n kube-system para investigar.

Causa Raíz: El log de eventos mostró Readiness probe failed: BIRD is not ready: ... stat /var/lib/calico/nodename: no such file or directory. Esto se debió a que la autodetección de red de Calico falló.

Solución: Modificar la configuración de Calico para indicarle explícitamente qué interfaz de red usar.

Limpiar la instalación fallida:

Bash

kubectl delete -f [https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml](https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml)
Identificar la interfaz de red correcta:

Bash

ip a
# En nuestro caso, la correcta era 'eth0'.
Descargar el manifiesto de Calico:

Bash

curl [https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml](https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml) -O
Modificar el manifiesto usando sed:

Bash

sed -i 's/IP: autodetect/IP_AUTODETECTION_METHOD: "interface=eth0"/' calico.yaml
Aplicar la configuración corregida:

Bash

kubectl apply -f calico.yaml
Tras estos pasos, todos los pods de Calico y CoreDNS pasaron al estado Running.

Fase 5: Configuración del Almacenamiento Persistente Dinámico
Un clúster kubeadm no incluye un sistema de almacenamiento por defecto. Para que los PersistentVolumeClaim (PVC) funcionen, debemos instalar un provisionador.

5.1 Instalar el Provisionador (Local Path Provisioner)
Esta es la solución más simple para un clúster de un solo nodo, imitando a Docker Desktop.

Bash

kubectl apply -f [https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml](https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml)
5.2 Error: Pod del Provisionador en estado Pending
El pod local-path-provisioner se quedó atascado y no se iniciaba.

Síntoma: kubectl get pods -n local-path-storage mostraba el pod como Pending.

Diagnóstico: Usamos kubectl describe pod <nombre-pod> -n local-path-storage.

Causa Raíz: El log de eventos mostró el mensaje: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }. Por defecto, kubeadm "restringe" (taint) el nodo maestro para que no ejecute cargas de trabajo normales.

Solución: Eliminar esa restricción (taint) del nodo maestro.

Ejecutar el comando para eliminar el taint:

Bash

kubectl taint nodes --all node-role.kubernetes.io/control-plane-
Verificar que el taint fue eliminado:

Bash

# Reemplazar <nombre-del-nodo> por el nombre real del nodo
kubectl describe node <nombre-del-nodo> | grep Taints
# La salida esperada es: Taints: <none>
Tras eliminar el taint, el pod pasó a estado Running.

5.3 Establecer la StorageClass por Defecto
Para que el almacenamiento funcione automáticamente sin especificar la clase en cada PVC, la hacemos la predeterminada.

Bash

kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
Fase 6: Depuración de Conectividad Externa
Incluso con la red del clúster funcionando, el tráfico que se origina desde el propio host (la VM) puede ser bloqueado o enrutado incorrectamente.

6.1 Error: Connection timeout expired en aplicaciones externas (pgAdmin)
Las aplicaciones en la VM no podían conectarse a servidores externos, aunque la red del clúster parecía sana.

Síntoma: Conexiones salientes desde la VM (no desde un pod) resultaban en un timeout.

Causa: El tráfico que se origina en el host no estaba siendo "enmascarado" (NAT) correctamente por las reglas de red de Linux. Los paquetes salían, pero las respuestas no sabían cómo volver.

Solución: Añadir una regla de iptables para enmascarar todo el tráfico saliente de la interfaz principal.

Añadir la regla de MASQUERADE:

Bash

sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
Hacer la regla permanente para que sobreviva reinicios:

Bash

# Instalar el paquete para persistencia
sudo apt-get install -y iptables-persistent

# Guardar las reglas actuales (seleccionar <Yes> en el diálogo)
sudo netfilter-persistent save
Con esto, tanto el tráfico de los pods como el del host se enrutan correctamente hacia el exterior.

Fase 7: Acceso Remoto al Clúster (para Lens)
Para gestionar el clúster con herramientas externas, necesitamos acceso a su archivo de configuración (kubeconfig).

7.1 Configurar kubectl localmente
Estos comandos, que kubeadm init proporciona, configuran el acceso para el usuario local en la VM.

Bash

mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
7.2 Error: Connection refused al usar scp
Al intentar copiar el kubeconfig a la máquina principal, la conexión fue rechazada.

Causa: El servicio de SSH no estaba instalado ni corriendo en la VM de Ubuntu.

Solución: Instalar y habilitar el servidor OpenSSH en la VM.

Bash

# Instalar el servicio
sudo apt-get install openssh-server

# Iniciarlo para la sesión actual
sudo systemctl start ssh

# Habilitarlo para que inicie en el arranque
sudo systemctl enable ssh
7.3 Copiar y Modificar el kubeconfig para Acceso Remoto
Ejecutar scp desde la computadora principal (anfitrión):

Bash

scp dml@192.168.80.230:/home/dml/.kube/config ./kubeconfig-cluster
Editar el archivo copiado (kubeconfig-cluster):
Abrir el archivo y modificar la dirección del servidor para que apunte a la IP pública de la VM.

Línea original: server: https://dml-virtual-machine:6443

Línea modificada: server: https://192.168.80.230:6443

Añadir a Lens:
En Lens, agregar un nuevo clúster usando este archivo kubeconfig-cluster modificado.