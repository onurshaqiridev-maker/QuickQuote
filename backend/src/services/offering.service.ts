/** A business's services and prices ("offerings" in code), with the plan's service limit. */
import * as offeringRepository from '../data/repositories/offering.repository';
import type { OfferingInput } from '../models/dto/offering.dto';
import { DomainError, NotFoundError } from '../models/errors';
import type { OfferingRequest } from '../models/requests/business.requests';
import type { OfferingResponse } from '../models/responses/business.response';
import { toOfferingResponse } from './mappers';
import { getPlanLimits } from './subscription.service';

/** Cleans up the input: no price for "on request", etc. */
function toInput(request: OfferingRequest, sortOrder: number): OfferingInput {
  return {
    name: request.name,
    description: request.description ?? null,
    priceType: request.priceType,
    priceCents: request.priceType === 'on_request' ? null : (request.priceCents ?? null),
    durationMinutes: request.durationMinutes ?? null,
    isBookable: request.isBookable,
    sortOrder,
  };
}

async function assertBelowServiceLimit(businessId: string): Promise<void> {
  const [limits, activeCount] = await Promise.all([getPlanLimits(businessId), offeringRepository.countActive(businessId)]);
  if (limits.maxServices !== null && activeCount >= limits.maxServices) {
    throw new DomainError(
      'PLAN_LIMIT_REACHED',
      `Your plan allows ${limits.maxServices} active services. Archive one or choose a bigger plan.`,
    );
  }
}

export async function listOfferings(businessId: string): Promise<OfferingResponse[]> {
  return (await offeringRepository.listByBusiness(businessId)).map(toOfferingResponse);
}

export async function createOffering(businessId: string, request: OfferingRequest): Promise<OfferingResponse> {
  await assertBelowServiceLimit(businessId);
  const sortOrder = request.sortOrder ?? (await offeringRepository.nextSortOrder(businessId));
  return toOfferingResponse(await offeringRepository.insert(businessId, toInput(request, sortOrder)));
}

export async function updateOffering(businessId: string, id: string, request: OfferingRequest): Promise<OfferingResponse> {
  const existing = await offeringRepository.findForBusiness(businessId, id);
  if (!existing) throw new NotFoundError('Service not found.');
  const isActive = request.isActive ?? existing.isActive;
  // Restoring an archived service counts against the limit too.
  if (isActive && !existing.isActive) await assertBelowServiceLimit(businessId);
  const updated = await offeringRepository.update(businessId, id, {
    ...toInput(request, request.sortOrder ?? existing.sortOrder),
    isActive,
  });
  if (!updated) throw new NotFoundError('Service not found.');
  return toOfferingResponse(updated);
}

/** "Delete" archives the service: it disappears for customers but old reservations keep it. */
export async function archiveOffering(businessId: string, id: string): Promise<OfferingResponse> {
  const archived = await offeringRepository.archive(businessId, id);
  if (!archived) throw new NotFoundError('Service not found.');
  return toOfferingResponse(archived);
}
