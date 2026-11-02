import type { Request, Response } from 'express';
import * as customerOverviewService from '../../../services/customer-overview.service';
import { currentUser } from '../../middleware/authenticate';
import { sendData } from '../../responses';

export async function getOverview(req: Request, res: Response): Promise<void> {
  sendData(res, await customerOverviewService.getCustomerOverview(currentUser(req).id));
}
