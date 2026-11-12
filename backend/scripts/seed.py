"""
Seed roles, admin user, catalog taxonomies, sample products, journal, FAQ.

Usage (from backend/):
  python -m scripts.seed
"""

from __future__ import annotations

import asyncio
from decimal import Decimal
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.marketplace import ListingStatus, PaymentMethod
from app.core.security import hash_password
from app.modules.auth.domain.entities import Role, User
from app.modules.categories.entities import Category
from app.modules.faq.entities import FaqItem
from app.modules.journal.entities import Article
from app.modules.products.entities import Product, ProductImage
from app.modules.rooms.entities import Room


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        # Roles
        for name, desc in (
            ("admin", "Marketplace administrator"),
            ("customer", "Buyer / seller account"),
        ):
            existing = await session.execute(select(Role).where(Role.name == name))
            if not existing.scalar_one_or_none():
                session.add(Role(name=name, description=desc))
        await session.flush()

        admin_role = (
            await session.execute(select(Role).where(Role.name == "admin"))
        ).scalar_one()
        customer_role = (
            await session.execute(select(Role).where(Role.name == "customer"))
        ).scalar_one()

        admin = await session.execute(
            select(User).where(User.email == "admin@goingtwice.eg")
        )
        if not admin.scalar_one_or_none():
            session.add(
                User(
                    full_name="Going Twice Admin",
                    email="admin@goingtwice.eg",
                    phone_number="+201000000000",
                    hashed_password=hash_password("admin123"),
                    role_id=admin_role.id,
                    is_active=True,
                    email_verified=True,
                    email_verified_at=datetime.now(timezone.utc),
                )
            )

        for email, name, phone in (
            ("seller@goingtwice.eg", "Layla Hassan", "+201111111111"),
            ("buyer@goingtwice.eg", "Ahmed Mostafa", "+201222222222"),
        ):
            exists = (
                await session.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            if exists:
                exists.email_verified = True
                exists.email_verified_at = exists.email_verified_at or datetime.now(
                    timezone.utc
                )
            else:
                session.add(
                    User(
                        full_name=name,
                        email=email,
                        phone_number=phone,
                        hashed_password=hash_password("password123"),
                        role_id=customer_role.id,
                        is_active=True,
                        email_verified=True,
                        email_verified_at=datetime.now(timezone.utc),
                    )
                )
        await session.flush()

        seller = (
            await session.execute(select(User).where(User.email == "seller@goingtwice.eg"))
        ).scalar_one()
        wallets = list(seller.payout_wallets or [])
        if not wallets:
            seller.pickup_city = "Cairo"
            seller.pickup_area = "Zamalek"
            seller.pickup_street = "26 El Gezira St"
            seller.pickup_building = "Villa 4"
            seller.payout_wallets = [
                {"id": "seed-instapay", "type": "instapay", "handle": "layla.hassan"},
                {"id": "seed-vodafone", "type": "vodafone_cash", "handle": "01111111111"},
                {"id": "seed-etisalat", "type": "etisalat_cash", "handle": "01000000000"},
            ]
            seller.payout_bank = {
                "holder_name": "Layla Hassan",
                "bank_name": "CIB",
                "iban": "EG380019000500000000263180002",
            }
        else:
            kinds = {
                str(row.get("type") or "")
                for row in wallets
                if isinstance(row, dict)
            }
            if "etisalat_cash" not in kinds:
                wallets.append(
                    {
                        "id": "seed-etisalat",
                        "type": "etisalat_cash",
                        "handle": "01000000000",
                    }
                )
                seller.payout_wallets = wallets

        categories = [
            ("Chairs", "chairs", "furniture", "/images/chairs.png", "Bergères and seating with silhouette."),
            ("Sofas", "sofas", "furniture", "/images/sofas.png", "Chaises and soft seating."),
            ("Tables", "tables", "furniture", "/images/tables.png", "Consoles, credenzas, and surfaces."),
            ("Lighting", "lighting", "lighting", "/images/lighting.png", "Floor lamps, pendants, chandeliers."),
            ("Rugs", "rugs", "decoration", "/images/rugs.png", "Kilims and textiles."),
            ("Mirrors", "mirrors", "decoration", "/images/french-empire-gilt-mirror.png", "Gilt and period mirrors."),
            ("Art", "art", "art", "/images/art.png", "Paintings and portraits."),
        ]
        for i, (name, slug, dept, image, desc) in enumerate(categories):
            exists = await session.execute(select(Category).where(Category.slug == slug))
            if not exists.scalar_one_or_none():
                session.add(
                    Category(
                        name=name,
                        slug=slug,
                        department=dept,
                        image_url=image,
                        description=desc,
                        sort_order=i,
                    )
                )

        rooms = [
            ("Living Room", "living-room", "/images/living-room.png"),
            ("Bedroom", "bedroom", "/images/bedroom.png"),
            ("Dining Room", "dining-room", "/images/dining-room.png"),
            ("Office", "office", "/images/living-room.png"),
            ("Outdoor", "outdoor", "/images/living-room.png"),
        ]
        for i, (name, slug, image) in enumerate(rooms):
            exists = await session.execute(select(Room).where(Room.slug == slug))
            if not exists.scalar_one_or_none():
                session.add(
                    Room(
                        name=name,
                        slug=slug,
                        image_url=image,
                        description=f"Pieces for the {name.lower()}.",
                        sort_order=i,
                    )
                )

        products = [
            {
                "slug": "louis-xv-bergere-armchair",
                "name": "Louis XV Bergère Armchair",
                "seller_name": "Layla Hassan",
                "price": Decimal("8500"),
                "image_url": "/images/louis-xv-bergere-armchair.png",
                "description": "A classic bergère with carved walnut frame and soft upholstery.",
                "condition": "Excellent — minor wear on seat edge",
                "dimensions": "W 72 × D 68 × H 96 cm",
                "era": "Louis XV revival, mid-20th century",
                "category_slug": "chairs",
                "department": "furniture",
                "room_slug": "living-room",
                "collection": "just-listed",
            },
            {
                "slug": "art-deco-brass-floor-lamp",
                "name": "Art Deco Brass Floor Lamp",
                "seller_name": "Omar Farouk",
                "price": Decimal("3200"),
                "image_url": "/images/art-deco-brass-floor-lamp.png",
                "description": "Tall brass stem with a clean Deco silhouette.",
                "condition": "Very good — light patina on base",
                "dimensions": "H 158 cm, base Ø 28 cm",
                "era": "Art Deco, c. 1930s–40s style",
                "category_slug": "lighting",
                "department": "lighting",
                "room_slug": "living-room",
                "collection": "just-listed",
            },
            {
                "slug": "mid-century-teak-credenza",
                "name": "Mid-Century Teak Credenza",
                "seller_name": "Nour Khalil",
                "price": Decimal("12000"),
                "image_url": "/images/mid-century-teak-credenza.png",
                "description": "Long teak sideboard with sliding doors and generous storage.",
                "condition": "Excellent — original finish retained",
                "dimensions": "W 180 × D 45 × H 78 cm",
                "era": "Mid-century, c. 1960s",
                "category_slug": "tables",
                "department": "furniture",
                "room_slug": "dining-room",
                "collection": "just-listed",
            },
            {
                "slug": "french-empire-gilt-mirror",
                "name": "French Empire Gilt Mirror",
                "seller_name": "Youssef Adel",
                "price": Decimal("4500"),
                "image_url": "/images/french-empire-gilt-mirror.png",
                "description": "Ornate gilt frame with classical detailing.",
                "condition": "Very good — small chips to gilding",
                "dimensions": "W 68 × H 95 cm",
                "era": "French Empire style",
                "category_slug": "mirrors",
                "department": "decoration",
                "room_slug": "bedroom",
                "collection": "editors-picks",
            },
            {
                "slug": "crystal-brass-chandelier",
                "name": "Crystal & Brass Chandelier",
                "seller_name": "Karim Nabil",
                "price": Decimal("5500"),
                "image_url": "/images/crystal-brass-chandelier.png",
                "description": "Brass frame with crystal drops.",
                "condition": "Excellent — fully rewired",
                "dimensions": "Ø 55 × H 62 cm",
                "era": "Mid-century European",
                "category_slug": "lighting",
                "department": "lighting",
                "room_slug": "dining-room",
                "collection": "editors-picks",
            },
            {
                "slug": "victorian-chaise-longue",
                "name": "Victorian Chaise Longue",
                "seller_name": "Hana Fouad",
                "price": Decimal("15500"),
                "image_url": "/images/victorian-chaise-longue.png",
                "description": "Elegant chaise with carved legs and deep seating.",
                "condition": "Good — upholstery refreshed",
                "dimensions": "W 165 × D 70 × H 88 cm",
                "era": "Victorian style",
                "category_slug": "sofas",
                "department": "furniture",
                "room_slug": "bedroom",
                "collection": "collectors-edit",
            },
        ]
        for row in products:
            exists = await session.execute(select(Product).where(Product.slug == row["slug"]))
            product = exists.scalar_one_or_none()
            if not product:
                product = Product(
                    **row,
                    seller_user_id=seller.id,
                    status=ListingStatus.PUBLISHED,
                    is_sold=False,
                    location_city="Cairo",
                    payment_methods=[
                        PaymentMethod.INSTAPAY,
                        PaymentMethod.BANK_TRANSFER,
                        PaymentMethod.VODAFONE_CASH,
                        PaymentMethod.ETISALAT_CASH,
                    ],
                )
                product.images.append(
                    ProductImage(image_url=row["image_url"], is_primary=True, sort_order=0)
                )
                session.add(product)
            elif product.seller_user_id is None:
                product.seller_user_id = seller.id
                product.status = ListingStatus.PUBLISHED
                product.location_city = product.location_city or "Cairo"
                if not product.payment_methods:
                    product.payment_methods = [
                        PaymentMethod.INSTAPAY,
                        PaymentMethod.BANK_TRANSFER,
                        PaymentMethod.VODAFONE_CASH,
                        PaymentMethod.ETISALAT_CASH,
                    ]
                elif PaymentMethod.ETISALAT_CASH not in list(product.payment_methods):
                    product.payment_methods = [
                        *product.payment_methods,
                        PaymentMethod.ETISALAT_CASH,
                    ]

        for product in (
            await session.execute(
                select(Product).where(Product.seller_user_id == seller.id)
            )
        ).scalars():
            methods = list(product.payment_methods or [])
            if PaymentMethod.ETISALAT_CASH not in methods:
                product.payment_methods = [*methods, PaymentMethod.ETISALAT_CASH]

        pending = await session.execute(
            select(Product).where(Product.slug == "vintage-oak-cabinet")
        )
        if not pending.scalar_one_or_none():
            listing = Product(
                slug="vintage-oak-cabinet",
                name="Vintage Oak Cabinet",
                seller_name=seller.full_name,
                seller_user_id=seller.id,
                price=Decimal("6800"),
                image_url="/images/mid-century-teak-credenza.png",
                description="Solid oak cabinet awaiting curation. Warm tone, original hardware.",
                condition="Very Good",
                dimensions="W 110 × D 42 × H 160 cm",
                era="Mid-century",
                category_slug="tables",
                department="furniture",
                room_slug="dining-room",
                status=ListingStatus.PENDING_REVIEW,
                is_sold=False,
                location_city="Cairo",
                payment_methods=[
                    PaymentMethod.INSTAPAY,
                    PaymentMethod.BANK_TRANSFER,
                    PaymentMethod.ETISALAT_CASH,
                ],
            )
            listing.images.append(
                ProductImage(
                    image_url="/images/mid-century-teak-credenza.png",
                    is_primary=True,
                    sort_order=0,
                )
            )
            session.add(listing)

        articles = [
            {
                "slug": "the-art-of-the-considered-interior",
                "tag": "Living",
                "title": "The Art of the Considered Interior",
                "excerpt": "Why the best-dressed rooms tell a story — and how second-hand pieces become its protagonists.",
                "image_url": "/images/the-art-of-the-considered-interior.png",
                "body": (
                    "A considered interior is not a mood board realised overnight.\n\n"
                    "Second-hand pieces excel here because they arrive with a past.\n\n"
                    "At Going Twice, we believe the most interesting homes in Cairo mix eras with intention."
                ),
            },
            {
                "slug": "five-pieces-worth-inheriting-this-season",
                "tag": "Guide",
                "title": "Five Pieces Worth Inheriting This Season",
                "excerpt": "From teak credenzas to gilt mirrors — the vintage silhouettes worth making room for.",
                "image_url": "/images/five-pieces-worth-inheriting-this-season.png",
                "body": (
                    "Not every vintage find deserves a permanent place.\n\n"
                    "This season we keep returning to teak, gilt, crystal, bergère, and kilim.\n\n"
                    "Browse Editor's Picks for current examples on Going Twice."
                ),
            },
        ]
        for row in articles:
            exists = await session.execute(select(Article).where(Article.slug == row["slug"]))
            if not exists.scalar_one_or_none():
                session.add(Article(**row))

        faqs = [
            (
                "How do I buy a piece?",
                "Browse the shop, open a listing, and enquire with the seller. Payments are via InstaPay or bank transfer.",
            ),
            (
                "How do I sell?",
                "Use Sell a Piece to submit details. Our team reviews every listing before it goes live.",
            ),
            (
                "What is confirmed handover?",
                "Both buyer and seller confirm when the piece has changed hands.",
            ),
        ]
        existing_faq = (await session.execute(select(FaqItem).limit(1))).scalar_one_or_none()
        if not existing_faq:
            for i, (q, a) in enumerate(faqs):
                session.add(FaqItem(question=q, answer=a, sort_order=i))

        await session.commit()
        print("Seed complete.")
        print("  Admin:  admin@goingtwice.eg / admin123")
        print("  Seller: seller@goingtwice.eg / password123")
        print("  Buyer:  buyer@goingtwice.eg / password123")


if __name__ == "__main__":
    asyncio.run(seed())
