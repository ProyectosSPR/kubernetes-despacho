# kubernetes-despacho
despacho


web/database/manager


# para odoo 19
odoo -d tu_base_de_datos -i base --without-demo=all --http-port=8067 --stop-after-init
# Dml-odoo

odoo -i base --without-demo=all --xmlrpc-port=8067 --stop-after-init
odoo -i base --xmlrpc-port=8067 --stop-after-init --database=odoo17
odoo -d odoo17 -u n8n-sales --without-demo=all --xmlrpc-port=8067 --stop-after-init

odoo -d odoo17 -u saa_s__access_management --without-demo=all --xmlrpc-port=8067 --stop-after-init
odoo -d odoo17 -u licencias_modulo --without-demo=all --xmlrpc-port=8067 --stop-after-init

Facturacion CFDI
odoo -d odoo18 --xmlrpc-port=8067 --init=


python odoo-bin -r odoo -w odoo --addons-path=addons -d mydb -i base --without-demo=all



----------postgres
kubectl port-forward service/postgres 5432:5432