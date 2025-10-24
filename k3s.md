## Desgarca del archivo kubeconfig 

```sudo cat /etc/rancher/k3s/k3s.yaml | sed 's/127.0.0.1/18.188.230.103/' ```


## El Plan (Borrar y Reinstalar)

Aquí están los pasos de nuevo.

### 1. Borra K3s Corrupto (En el MAESTRO de AWS)

En tu terminal `ubuntu@ip-172...`, ejecuta estos dos comandos para borrar K3s y su base de datos rota:

```bash
# 1. Desinstala el servidor K3s
sudo /usr/local/bin/k3s-uninstall.sh

# 2. BORRA la base de datos y todos los datos viejos
sudo rm -rf /var/lib/rancher/k3s
```

### 2. Reinstala K3s (En el MAESTRO de AWS)

Ahora, instálalo de nuevo. Esto creará una base de datos nueva y limpia.

```bash
curl -sfL https://get.k3s.io | sh -s - server --tls-san 18.188.230.103
```

### 3. Obtén el NUEVO Token

La instalación nueva creó un token nuevo. Léelo:

```bash
sudo cat /var/lib/rancher/k3s/server/node-token
```

Copia este **NUEVO** token.

### 4. Arregla tus Workers

Ahora, ve a ambos workers (`k3s-virtual-machine` y `dml-a520m-k-v2`):

```bash
# 1. Desinstala el agente viejo
sudo /usr/local/bin/k3s-agent-uninstall.sh

# 2. Instala el agente nuevo con la IP y el NUEVO TOKEN
curl -sfL https://get.k3s.io | K3S_URL=https://18.188.230.103:6443 K3S_TOKEN="K109d61adc5b813c231e6cf526f32633b09f65bded98179a649ebe39be591ba4986::server:cd0e83126838b61289310a2b38bc145a" sh -
```
*(Nota: El último comando parece estar incompleto en tu texto original).*
