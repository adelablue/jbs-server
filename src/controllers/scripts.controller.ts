import { Request, Response, NextFunction } from 'express';
import AuthApi from '../api/auth';
import ScriptsRepo from '../repositories/scripts.repository';
import { InvalidRequestException, ResourceAlreadyExist, ResourceNotFoundException } from '../exceptions/custom.exceptions';
import { BaseController } from './base.controller';
import FileService from '../services/file.service';
import config from '../config';

export class ScriptsController extends BaseController {
  getScripts = async (req: Request, res: Response) => {
    try {
      let offset = parseInt(req.query.offset);
      let limit = parseInt(req.query.limit);
      const { keyword } = req.query;
      if (!offset) {
        offset = config.query.offset;
      }
      if (!limit) {
        limit = config.query.limit;
      }
      let result = await ScriptsRepo.find({ keyword, offset, limit });
      const links = this.generateLinks(result.pagination, req.route.path, '');
      result = Object.assign({}, result, links);

      res.json(result);
    } catch (err) {
      res.send(err);
    }
  };

  getScript = async (req: Request, res: Response, next: NextFunction) => {
    const { scriptId } = req.params;
    const script = await ScriptsRepo.findById(scriptId);
    // console.log(script);
    if (!script) {
      next(new ResourceNotFoundException(`Script`, scriptId));
      return;
    }
    res.json({ code: 'SUCCESS', data: script });
  };

  addScript = async (req: Request, res: Response, next: NextFunction) => {
    // console.log(req);
    const { key, name, description, minNumberOfPersons, maxNumberOfPersons, duration, introImage, tags } = req.body;
    if (!key) {
      next(new InvalidRequestException('AddScript', ['key']));
      return;
    }
    const script = await ScriptsRepo.findOne({ key });
    // console.log(script);
    if (script) {
      next(new ResourceAlreadyExist(`Script`, key));
      return;
    }
    const newScript = await ScriptsRepo.saveOrUpdate({
      key,
      name,
      description,
      minNumberOfPersons,
      maxNumberOfPersons,
      duration,
      introImage,
      tags,
      createdAt: new Date()
    });
    res.json({ code: 'SUCCESS', data: newScript });
  };
}
