"""
Management command: (re)create the local demo account used by /api/auth/demo-login/.

Deletes any existing demo-prefixed users, then runs the synthetic data pipeline
for a single user with a fixed random seed, so the demo looks the same every time.

Usage:
    python manage.py seed_demo
    python manage.py seed_demo --months 12
"""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from datagen.pipeline import run_pipeline

User = get_user_model()

DEMO_PREFIX = "demo_"
DEMO_SEED = 42


class Command(BaseCommand):
    help = "Reset and seed the deterministic local demo account (demo_user_0)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--months", type=int, default=6,
            help="Months of transaction history to generate (default: 6).",
        )

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError("seed_demo only runs with DEBUG on (local development).")

        deleted, _ = User.objects.filter(username__startswith=DEMO_PREFIX).delete()
        if deleted:
            self.stdout.write(f"Removed previous demo data ({deleted} rows).")

        stats = run_pipeline(
            num_users=1,
            months=opts["months"],
            prefix=DEMO_PREFIX,
            seed=DEMO_SEED,
            log=lambda msg: None,
        )

        username = f"{DEMO_PREFIX}user_0"
        user = User.objects.get(username=username)
        user.first_name = "Alex"
        user.save(update_fields=["first_name"])

        self.stdout.write(self.style.SUCCESS(
            f"Demo account ready: {username}\n"
            f"  Transactions:  {stats['transactions']}\n"
            f"  Subscriptions: {stats['subscriptions']}\n"
            f"Sign in with the \"Try the demo account\" button on /login."
        ))
