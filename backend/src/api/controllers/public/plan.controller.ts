import type { Request, Response } from 'express';
import * as planService from '../../../services/plan.service';
import { sendData } from '../../responses';

export async function listPlans(_req: Request, res: Response): Promise<void> {
  sendData(res, await planService.listActivePlans());
}
