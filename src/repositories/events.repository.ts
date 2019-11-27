import * as mongoose from 'mongoose';
import { ScriptSchema } from '../models/script.model';
import { EventSchema } from '../models/event.model';
import { PriceWeeklySchemaSchema } from '../models/priceWeeklySchema.model';
import { DiscountRuleSchema } from '../models/discountRule.model';
import { EventCommissionSchema } from '../models/eventCommissions.model';
import { CommonRepo } from './common.repository';
import * as moment from 'moment';
import { nowDate } from '../utils/dateUtil';
const Event = mongoose.model('Event', EventSchema, 'events');
const PriceWeeklySchema = mongoose.model('PriceWeeklySchema', PriceWeeklySchemaSchema, 'priceWeeklySchema');
const DiscountRule = mongoose.model('DiscountRule', DiscountRuleSchema, 'discountRules');
const EventCommission = mongoose.model('EventCommission', EventCommissionSchema, 'eventCommissions');

mongoose.set('useFindAndModify', false);

class EventsRepo extends CommonRepo {
  async getSession() {
    return super.getSession(Event);
  }

  async endSession() {
    super.endSession();
  }

  async findById(id: string, filter = { status: ['ready', 'completed', 'expired'] }) {
    // console.log('script ' + mongoose.Types.ObjectId.isValid(id));
    const { status } = filter;
    return await Event.where({ _id: id, status: { $in: status } })
      .findOne()
      .populate('script')
      .populate('shop', ['_id', 'name', 'key', 'address', 'mobile', 'phone', 'wechatId', 'wechatName'])
      .populate('hostUser', ['_id', 'openId', 'nickName', 'avatarUrl', 'gender', 'country', 'province', 'city', 'language', 'mobile', 'wechatId', 'ageTag'])
      .populate({
        path: 'members',
        match: { status: { $in: ['unpaid', 'paid'] } },
        populate: {
          path: 'user',
          select: '_id openId nickName avatarUrl gender country province city language mobile wechatId ageTag'
        },
        select: '_id source status mobile wechatId createdAt'
      })
      .populate('discountRule')
      .populate({
        path: 'commissions'
      })
      .exec();
  }

  async findByIdSimplified(id: string, filter = { status: ['ready', 'completed', 'expired'] }) {
    const { status } = filter;
    return await Event.where({ _id: id, status: { $in: status } })
      .findOne()
      .populate('script')
      .populate('shop', ['name', 'key'])
      .populate('hostUser', ['nickName', 'mobile', 'wechatId'])
      .populate({
        path: 'members',
        match: { status: { $in: ['unpaid', 'paid'] } },
        populate: {
          path: 'user',
          select: 'nickName mobile wechatId'
        },
        select: 'source status mobile wechatId createdAt'
      })
      .populate({
        path: 'commissions'
      })
      .exec();
  }

  async findPriceWeeklySchemaByEvent(scriptId: string, shopId: string) {
    return await PriceWeeklySchema.find(
      {
        script: scriptId,
        shop: shopId
      },
      { _id: 0, priceSchema: 1, createdAt: 1, updatedAt: 1 }
    )
      .findOne()
      .exec();
  }

  async find(params, filter = { status: ['ready'], availableSpots: -1 }) {
    const { status, availableSpots } = filter;
    const { offset, limit, keyword, scriptId, shopId } = params;
    const condition = {
      status: { $in: status }
    };
    if (scriptId) {
      condition['script'] = scriptId;
    }
    if (shopId) {
      condition['shop'] = shopId;
    }
    if (availableSpots !== -1) {
      condition['minNumberOfAvailableSpots'] = { $lte: availableSpots, $gt: 0 };
    }
    // console.log(condition);
    const total = await Event.countDocuments(condition).exec();
    const pagination = { offset, limit, total };
    const pagedEvents = await Event.find(condition)
      .populate('script')
      .populate('shop', ['_id', 'name', 'key', 'address', 'mobile', 'phone', 'wechatId', 'wechatName'])
      .populate('hostUser', ['_id', 'openId', 'nickName', 'avatarUrl', 'gender', 'country', 'province', 'city', 'language', 'mobile', 'wechatId', 'ageTag'])
      .populate('commissions')
      .populate({
        path: 'members',
        match: { status: { $in: ['unpaid', 'paid'] } },
        select: '_id user source status mobile wechatId createdAt'
      })
      .skip(offset)
      .limit(limit)
      .sort({ startTime: 1 })
      .exec();
    return { pagination, data: pagedEvents };
  }

  async findByDate(fromDate: moment.Moment, toDate: moment.Moment, filter: any = { status: ['ready', 'completed', 'expired'] }) {
    const condition = {
      startTime: {
        $gte: fromDate,
        $lte: toDate
      }
    };
    const { status } = filter;
    if (status) {
      condition['status'] = {
        $in: status
      };
    }
    // console.log(condition);
    return await Event.find(condition)
      .populate('script')
      .populate('shop', ['_id', 'name', 'key', 'address', 'mobile', 'phone', 'wechatId', 'wechatName'])
      .populate('hostUser', ['_id', 'openId', 'nickName', 'mobile', 'wechatId', 'ageTag'])
      .populate('script')
      .sort({ startTime: 1 })
      .exec();
  }

  async findEventsCountByDates(from: moment.Moment, to: moment.Moment, filter: any = { status: ['ready', 'completed', 'expired'] }) {
    const { status } = filter;
    return await Event.aggregate([
      {
        $project: {
          _id: 1,
          startTime: 1,
          status: 1,
          startDate: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$startTime',
              timezone: '+08:00'
            }
          }
        }
      },
      {
        $match: {
          status: { $in: status },
          startTime: { $gte: from.toDate(), $lte: to.toDate() }
        }
      },
      {
        $group: {
          _id: '$startDate',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          startDate: '$_id',
          numberOfEvents: '$count'
        }
      }
    ]).exec();
  }

  async findOne(params) {
    return await Event.where(params)
      .findOne()
      .exec();
  }

  async saveEventCommissions(commissions, opt: object = {}) {
    const options = {
      ...opt,
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      returnNewDocument: true
    };
    const { event } = commissions;
    return await EventCommission.findOneAndUpdate({ event }, commissions, options).exec();
  }

  async saveOrUpdate(event, opt: object = {}) {
    const options = {
      ...opt,
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      returnNewDocument: true
    };
    const { id: eventId, shop, script, startTime, endTime, hostUser } = event;
    if (eventId) {
      return await Event.findOneAndUpdate({ _id: eventId }, event, options).exec();
    } else {
      return await Event.findOneAndUpdate({ shop, script, startTime, endTime, hostUser }, event, options).exec();
    }
  }

  async findDiscountRulesByShopAndScript(shopId: string, scriptId?: string) {
    const condition = { shop: shopId };
    if (scriptId) {
      condition['script'] = scriptId;
    }
    return await DiscountRule.find(condition, {
      _id: 0,
      rules: 1,
      createdAt: 1,
      updatedAt: 1
    }).exec();
  }

  async findEventsByUser(userId: string, filter: any = { status: ['ready', 'completed', 'expired'] }) {
    const condition = { hostUser: userId };
    const { status } = filter;
    if (status) {
      condition['status'] = {
        $in: status
      };
    }
    const myHostEvents = await Event.find(condition)
      .populate('hostUser', ['_id', 'openId', 'nickName', 'avatarUrl', 'gender', 'country', 'province', 'city', 'language'])
      .populate({
        path: 'members',
        match: { status: { $in: ['unpaid', 'paid'] } },
        populate: {
          path: 'user',
          select: '_id openId nickName avatarUrl gender country province city language mobile wechatId ageTag'
        },
        select: '_id source status mobile wechatId createdAt'
      })
      .populate('shop', ['_id', 'name', 'key', 'address', 'mobile', 'phone', 'wechatId', 'wechatName'])
      .populate('script')
      .sort({ startTime: 1 })
      .exec();
    const eventsUserJoined = (
      await Event.find({ status: { $in: status } })
        .populate('hostUser', ['_id', 'openId', 'nickName', 'avatarUrl', 'gender', 'country', 'province', 'city', 'language', 'mobile', 'wechatId', 'ageTag'])
        .populate({
          path: 'members',
          match: { user: userId, status: { $in: ['unpaid', 'paid'] } },
          select: 'nickName openId avatarUrl gender country province city language',
          populate: {
            path: 'user',
            select: '_id openId nickName avatarUrl gender country province city language mobile wechatId ageTag'
          }
        })
        .populate('shop', ['_id', 'name', 'key', 'address', 'mobile', 'phone', 'wechatId', 'wechatName'])
        .populate('script')
        .sort({ startTime: 1 })
        .exec()
    ).filter(event => {
      const { members } = event;
      return members.length > 0;
    });

    const userEvents = myHostEvents;
    for (let i = 0; i < eventsUserJoined.length; i++) {
      const event1 = eventsUserJoined[i];
      let duplicated = false;
      for (let j = 0; j < userEvents.length; j++) {
        const event2 = userEvents[j];
        if (event2.id === event1.id) {
          duplicated = true;
          break;
        }
      }
      if (!duplicated) {
        userEvents.push(event1);
      }
    }
    return userEvents.sort(this.compare);
  }

  compare(a, b) {
    // Use toUpperCase() to ignore character casing
    const { startTime: startTimeA } = a;
    const { startTime: startTimeB } = b;
    let comparison = 0;
    if (startTimeA > startTimeB) {
      comparison = -1;
    } else if (startTimeA < startTimeB) {
      comparison = 1;
    }
    return comparison;
  }

  // async updateExpiredEvents(opt: object = {}) {
  //   const now = nowDate();
  //   console.log(now);

  //   const condition = {
  //     endTime: { $lt: now },
  //     status: 'ready'
  //   };
  //   return await Event.findAndModify(condition, {
  //     $set: { status: 'expired' }
  //   }).exec();
  // }

  /**
   * Only archive event when
   * 1. startTime is past
   * 2. status is ready
   * 3. not full
   * @param {object = {}} opt [description]
   */
  async archiveEvents(opt: object = {}) {
    const options = {
      ...opt,
      upsert: false,
      new: true
    };
    console.log(nowDate());
    const condition = {
      startTime: { $lt: nowDate() },
      status: { $in: ['ready'] },
      minNumberOfAvailableSpots: { $gt: 0 }
    };
    const events = await Event.find(condition).exec();
    const eventIds = events.map(_ => _.id);
    const response = await Event.updateMany(condition, { status: 'expired' }, options).exec();
    const { nModified: affectedRows } = response;
    return { eventIds, affectedRows };
  }
}
export default new EventsRepo();
