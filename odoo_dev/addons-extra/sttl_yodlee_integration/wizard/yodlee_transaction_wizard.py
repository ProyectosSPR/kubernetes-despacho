# -*- coding: utf-8 -*-

from odoo import models, fields, _
import requests
import datetime
from odoo.exceptions import AccessError, ValidationError
import datetime


class YodleeTransaction(models.TransientModel):
    _name = "yodlee.transaction.wizard"

    bank_id = fields.Many2one("yodlee.bank", required=True)
    account_ids = fields.Many2many("yodlee.account", string="Accounts", required=True)
    from_date = fields.Date("From Date", required=True)
    to_date = fields.Date("To Date", required=True)

    def fetch_transactions(self):
        """
            Fetches Transations of the given accounts within given time period.
        """
        if self.to_date < self.from_date:
            raise ValidationError("To date must be greater than From date")
        client_id = self.env['ir.config_parameter'].get_param(
            'sttl_yodlee_integration.yodlee_client_id')
        secret = self.env['ir.config_parameter'].get_param(
            'sttl_yodlee_integration.yodlee_api_secret')
        api_endpoint = self.env['ir.config_parameter'].get_param(
            'sttl_yodlee_integration.yodlee_api_endpoint')
        transactions = []
        if client_id and secret and api_endpoint:
            url = f"{api_endpoint}/transactions"
            access_token = self.bank_id.get_access_token(api_endpoint, client_id, secret)
            if access_token:
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Api-Version': '1.1'
                }
                bank_journal = self.env["account.journal"].search([('type', '=', 'bank')], limit=1)
                for account in self.account_ids:
                    params = {
                        "account_id": account.account_id,
                        "fromDate": self.from_date.strftime("%Y-%m-%d"),
                        "toDate": self.to_date.strftime("%Y-%m-%d"),
                    }
                    response = requests.request("GET", url, headers=headers, params=params)
                    if response.ok:
                        json_data = response.json()
                        for transaction in json_data.get("transaction", []):
                            transaction_dict = {
                                "amount": transaction.get("amount").get("amount", 0) if transaction.get("amount") else 0,
                                "currency_id": self.env.company.currency_id.id,
                                "transaction_type": transaction.get("categoryType") if transaction.get("categoryType") else "",
                                "account_number": account.account_number,
                                "payment_ref": transaction.get("description").get("original") if transaction.get("description") else "",
                                "journal_id": bank_journal.id,
                                "date": transaction.get("date") if transaction.get("date") else False
                            }
                            transactions.append(transaction_dict)
                    else:
                        raise AccessError(response.text)
                if transactions:
                    bank_statement = self.env["account.bank.statement"].create({
                        "name": f"Yodlee Statement ({self.from_date} - {self.to_date})",
                        "date": datetime.datetime.now(),
                        "journal_id": bank_journal.id,
                    })
                    for transaction in transactions:
                        move_data = {
                            "date": datetime.date.today(),
                            "state": "draft",
                            "move_type": "entry",
                            "journal_id": bank_journal.id,
                            "currency_id": self.env.company.currency_id.id,
                            "ref": transaction.get("payment_ref")
                        }
                        move_id = self.env["account.move"].create(move_data)
                        transaction["statement_id"] = bank_statement.id
                        transaction["move_id"] = move_id.id
                    self.env["account.bank.statement.line"].create(transactions)
                    return {
                        'type': 'ir.actions.client',
                        'tag': 'display_notification',
                        'params': {
                            'type': 'success',
                            'sticky': False,
                            'message': _("Transactions successfully fetched!"),
                            'next': {'type': 'ir.actions.act_window_close'},
                        }
                    }
                else:
                    return {
                        'type': 'ir.actions.client',
                        'tag': 'display_notification',
                        'params': {
                            'type': 'warning',
                            'sticky': False,
                            'message': _("No Transactions to fetch!"),
                            'next': {'type': 'ir.actions.act_window_close'},
                        }
                    }
            else:
                raise AccessError("Unable to generate access token")
