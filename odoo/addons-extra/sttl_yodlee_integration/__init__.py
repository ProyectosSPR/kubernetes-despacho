# -*- coding: utf-8 -*-

from . import models
from . import wizard
from . import controller

def uninstall_hook(env):
    account_module = env['ir.module.module'].search([('name', '=', 'account')])
    if account_module and account_module.state == 'installed':
        account_module.button_upgrade()
