import type { Request, Response } from 'express';
import * as configService from '../../../services/config.service';
import { sendData } from '../../responses';

export function getConfig(_req: Request, res: Response): void {
  sendData(res, configService.getPlatformConfig());
}
