# kubernetes-despacho
despacho


web/database/manager

# Dml-odoo

odoo -i base --without-demo=all --xmlrpc-port=8067 --stop-after-init
odoo -i base --xmlrpc-port=8067 --stop-after-init --database=odoo16
odoo -d odoo18 -u web_extension_community --without-demo=all --xmlrpc-port=8067 --stop-after-init
odoo -d odoo18 --xmlrpc-port=8067 --init=


python odoo-bin -r odoo -w odoo --addons-path=addons -d mydb -i base --without-demo=all