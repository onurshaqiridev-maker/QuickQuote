/**
 * Fills a DEVELOPMENT database with realistic demo businesses and customers,
 * so the website does not look empty. Used by `npm run seed:demo`.
 * Safe to run twice: accounts that already exist are skipped.
 */
import { withTransaction } from '../data/db';
import * as businessRepository from '../data/repositories/business.repository';
import * as categoryRepository from '../data/repositories/category.repository';
import * as offeringRepository from '../data/repositories/offering.repository';
import * as photoRepository from '../data/repositories/photo.repository';
import * as scheduleRepository from '../data/repositories/schedule.repository';
import * as userRepository from '../data/repositories/user.repository';
import type { DemoBusinessSpec, DemoCustomerSpec, DemoSeedSummary } from '../models/dto/demo.dto';
import { slugify } from './auth.service';
import { hashPassword } from './password.service';
import { saveImage } from './storage.service';

export async function seedDemoData(data: { businesses: DemoBusinessSpec[]; customers: DemoCustomerSpec[]; password: string }): Promise<DemoSeedSummary> {
  const summary: DemoSeedSummary = { businessesCreated: 0, customersCreated: 0, skipped: 0 };
  const passwordHash = await hashPassword(data.password);
  const categoryIds = await categoryRepository.findIdsBySlugs(data.businesses.flatMap((b) => b.categorySlugs));

  for (const customer of data.customers) {
    if (await userRepository.findByEmail(customer.email)) {
      summary.skipped += 1;
      continue;
    }
    await userRepository.insert({ email: customer.email, passwordHash, fullName: customer.fullName, phone: null, role: 'customer', emailVerified: true });
    summary.customersCreated += 1;
  }

  for (const spec of data.businesses) {
    if (await userRepository.findByEmail(spec.ownerEmail)) {
      summary.skipped += 1;
      continue;
    }
    const businessId = await withTransaction(async (tx) => {
      const owner = await userRepository.insert(
        { email: spec.ownerEmail, passwordHash, fullName: spec.ownerName, phone: spec.phone, role: 'business_owner', emailVerified: true },
        tx,
      );
      const business = await businessRepository.insert({ ownerUserId: owner.id, timezone: 'Europe/Berlin' }, tx);
      await businessRepository.insertProfile({ businessId: business.id, slug: slugify(spec.name), displayName: spec.name, city: spec.city }, tx);
      await businessRepository.updateProfile(
        business.id,
        {
          displayName: spec.name,
          description: spec.description,
          contactEmail: spec.ownerEmail,
          contactPhone: spec.phone,
          websiteUrl: spec.website,
          addressLine: spec.addressLine,
          city: spec.city,
          postalCode: spec.postalCode,
          country: spec.country,
        },
        tx,
      );
      const ids = spec.categorySlugs.map((slug) => categoryIds.get(slug)).filter((id): id is string => Boolean(id));
      await businessRepository.addCategoryLinks(business.id, ids, tx);
      for (const [index, service] of spec.services.entries()) {
        await offeringRepository.insert(business.id, { ...service, description: service.description ?? null, sortOrder: index }, tx);
      }
      await scheduleRepository.replaceWorkingHours(
        business.id,
        spec.hours.flatMap((block) => block.days.map((day) => ({ dayOfWeek: day, startTime: block.startTime, endTime: block.endTime }))),
        tx,
      );
      await businessRepository.setPublished(business.id, true, tx);
      if (spec.approved) {
        await businessRepository.changeStatus(business.id, { to: 'approved', from: ['pending_review'], reason: null, adminUserId: null }, tx);
      }
      return business.id;
    });

    // Images are files, saved after the database rows exist.
    const logoUrl = await saveImage(`businesses/${businessId}`, { buffer: spec.logo, originalName: 'logo.png', size: spec.logo.length });
    await businessRepository.setLogoUrl(businessId, logoUrl);
    for (const photo of spec.photos) {
      const url = await saveImage(`businesses/${businessId}`, { buffer: photo.image, originalName: 'photo.png', size: photo.image.length });
      await photoRepository.insert({ businessId, imageUrl: url, caption: photo.caption });
    }
    summary.businessesCreated += 1;
  }
  return summary;
}
