# -*- coding: utf-8 -*-

from odoo import models, fields


class YodleeAccount(models.Model):
    _name = "yodlee.account"

    name = fields.Char(string="Account Name")
    account_id = fields.Char(string="Account No")
    account_number = fields.Char(string="Account Number")
    provider_name = fields.Char("Provider Name")
    currency_id = fields.Many2one("res.currency")
    balance = fields.Monetary(string="Balance", store=True)
    account_type = fields.Char(string="Account Type")
    bank_id = fields.Many2one("yodlee.bank")
