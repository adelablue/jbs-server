import config from '../config';
import { randomSerialNumber } from '../utils/stringUtil';
import UsersRepository from '../repositories/users.repository';
import NotificationRepository from '../repositories/notifications.repository';
const axios = require('axios');
import logger from '../utils/logger';
import { date2String } from '../utils/dateUtil';
import { queryStringToJSON, replacePlacehoder } from '../utils/stringUtil';

const { spCode, loginName, password } = config.sms;
class MessageService {
  async sendMessage(message: string, recipients: string[], serialNumber: string) {
    const numbers = recipients.join(',');
    const encodedMessage = encodeURIComponent(message);
    try {
      const {
        sms: { enabled: smsEnabled }
      } = config;
      const url = `http://47.104.243.247:8513/sms/Api/Send.do?SpCode=${spCode}&LoginName=${loginName}&Password=${password}&SerialNumber=${serialNumber}&MessageContent=${encodedMessage}&UserNumber=${numbers}`;
      logger.info(`Sending sms to ${url}`);
      if (smsEnabled) {
        const response = await axios.get(url);
        // console.log(response);
        const { data } = response;
        logger.info(`Response, ${data}`);
        return queryStringToJSON(data);
      } else {
        logger.info('SMS sendout is disabled');
        return { code: 100, description: 'sms disable' };
      }
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }

  /**
   * [saveCompleteEventNotifications description]
   * @param {[type]} event   [description]
   * @param {[type]} options [description]
   */
  async saveCompleteEventNotifications(event, options) {
    const notifications = [];
    try {
      notifications.push(await this.createNotifications(event, 'event_completed', 'shop'));
      console.log(notifications);
      const response = await NotificationRepository.saveNotifications(notifications, options);

      await this.sendNewEventMessages(notifications, options);
      return response;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Generate new event notification.
   *
   * @param {[type]} event   [description]
   * @param {[type]} options [description]
   */
  async saveNewEventNotifications(event, options) {
    const notifications = [];
    try {
      notifications.push(await this.createNotifications(event, 'event_created', 'shop'));
      notifications.push(await this.createNotifications(event, 'event_created', 'host'));
      const response = await NotificationRepository.saveNotifications(notifications, options);

      await this.sendNewEventMessages(notifications, options);
      return response;
    } catch (err) {
      throw err;
    }
  }

  async sendNewEventMessages(notifications, options) {
    for (let i = 0; i < notifications.length; i++) {
      const { message, recipients, serialNumber } = notifications[i];
      const response = await this.sendMessage(message, recipients, serialNumber);
      const notificationToUpdate = Object.assign(notifications[i], response);
      await NotificationRepository.updateNotificationStatus(notificationToUpdate, options);
    }
  }

  async createNotifications(event, eventType: string, audience: string) {
    const notifications = [];
    const {
      sms: { templates }
    } = config;
    let shopMessageTemplate = undefined;
    let recipient = undefined;
    // console.log(eventType);
    // console.log(templates);
    switch (eventType) {
      case 'event_created':
        const { event_created } = templates;
        shopMessageTemplate = event_created[audience];
        if (audience === 'shop') {
          const {
            shop: { mobile }
          } = event;
          recipient = mobile;
        } else if (audience === 'host') {
          const { hostUserMobile } = event;
          recipient = hostUserMobile;
        }
        break;
      case 'event_completed':
        const { event_completed } = templates;
        shopMessageTemplate = event_completed[audience];
        const commissionText = await this.generateCommissionDetailContext(event);
        shopMessageTemplate = this.updateMessageTemplate(shopMessageTemplate, ['commissionDetails'], { event, commissionDetails: commissionText });
        if (audience === 'shop') {
          const {
            shop: { mobile }
          } = event;
          recipient = mobile;
        } else if (audience === 'host') {
          const { hostUserMobile } = event;
          recipient = hostUserMobile;
        }
        break;
      case 'event_joined':
        const { event_joined } = templates;
        shopMessageTemplate = event_joined[audience];
        break;
    }

    if (!recipient) {
      throw new Error(`Cannot find recipient by eventType ${eventType}, audience ${audience}, event ${event.id}`);
      return;
    }
    // const eventType = 'event_created';
    // const audience = 'shop';
    if (!shopMessageTemplate) {
      throw new Error(`Cannot find message template by eventType ${eventType}, audience ${audience}, event ${event.id}`);
      return;
    }
    const {
      id: objectId,
      shop: { mobile }
    } = event;
    const status = 'created';
    return {
      serialNumber: randomSerialNumber(),
      eventType,
      audience,
      objectId,
      message: this.updateMessageTemplate(shopMessageTemplate, config.sms.placeholders, { event }),
      recipients: [recipient]
    };
  }

  async generateCommissionDetailContext(event) {
    // console.log(event);
    const { commissions, members } = event;
    if (commissions.length === 0) {
      return '';
    }

    const commission = commissions[0];

    const {
      commissions: {
        host: { user: hostUserId, amount: hostCommission },
        participators
      }
    } = commission;
    const hostUser = await UsersRepository.findById(hostUserId);
    const { hostName, hostWechatId } = hostUser;
    const hostMessageTemplate = '发起人 <hostName>(<hostWechatId>) <hostCommission>元';
    const hostMessage = this.updateMessageTemplate(hostMessageTemplate, ['hostName', 'hostWechatId', 'hostCommission'], { event, hostCommission });
    let participatorMessage = '';
    for (let i = 0; i < participators.length; i++) {
      const participator = participators[i];
      const { user: userId, amount: participatorCommission } = participator;
      const participatorUser = await UsersRepository.findById(userId);
      const { nickName } = participatorUser;
      const { wechatId } = this.getParticipatorUser(members, userId);
      const participatorMessageTemplate = `${i + 1}. <participatorName>(<participatorWechatId>) <participatorCommission>元 `;
      const participatorMessagePart = this.updateMessageTemplate(participatorMessageTemplate, ['participatorName', 'participatorWechatId', 'participatorCommission'], {
        event,
        participatorCommission,
        participatorName: nickName,
        participatorWechatId: wechatId
      });
      participatorMessage = participatorMessage + participatorMessagePart;
    }
    return hostMessage + ' ' + participatorMessage;
  }

  /**
   * Find member info by id.
   *
   * @param {[type]} eventUsers [description]
   * @param {string} userId     [description]
   */
  getParticipatorUser(eventUsers, userId: string) {
    for (let i = 0; i < eventUsers.length; i++) {
      const eventUser = eventUsers[i];
      const {
        user: { _id: eventUserId }
      } = eventUser;
      if (eventUserId.toString() == userId) {
        return eventUser;
      }
    }
    return undefined;
  }

  // 【不咕咕】拼团成功！<shopName>，《<scriptName>》[<startTime>]拼团成功，请锁场！感谢<hostName>（微信号）的辛勤组团，根据不咕咕返现规则，您需要依次返现给①<hostName>（微信号）xxx元；②[参加者]（微信号）xx元；③[参加者]（微信号）xx元；④[参加者]（微信号）xx元；⑤[参加者]（微信号）xx元… 若有疑问，请联系不咕咕官方微信。
  updateMessageTemplate(messageTemplate: string, placeholders: string[], replacements) {
    let message = messageTemplate;
    try {
      for (let i = 0; i < placeholders.length; i++) {
        const placeholder = placeholders[i];
        const {
          shop: { name: shopName, wechatId: shopWechatId },
          hostUser: { nickName },
          hostUserWechatId,
          script: { name: scriptName },
          startTime
        } = replacements.event;
        const { hostCommission, participatorName, participatorWechatId, participatorCommission, commissionDetails } = replacements;
        switch (placeholder) {
          case 'shopWechatId':
            message = replacePlacehoder(message, placeholder, shopWechatId);
            break;
          case 'shopName':
            message = replacePlacehoder(message, placeholder, shopName);
            break;
          case 'hostName':
            message = replacePlacehoder(message, placeholder, nickName);
            break;
          case 'hostWechatId':
            message = replacePlacehoder(message, placeholder, hostUserWechatId);
            break;
          case 'scriptName':
            message = replacePlacehoder(message, placeholder, scriptName);
            break;
          case 'startTime':
            message = replacePlacehoder(message, placeholder, date2String(startTime));
            break;
          case 'hostCommission':
            message = replacePlacehoder(message, placeholder, hostCommission);
            break;
          case 'commissionDetails':
            message = replacePlacehoder(message, placeholder, commissionDetails);
            break;
          case 'participatorName':
            message = replacePlacehoder(message, placeholder, participatorName);
            break;
          case 'participatorWechatId':
            message = replacePlacehoder(message, placeholder, participatorWechatId);
            break;
          case 'participatorCommission':
            message = replacePlacehoder(message, placeholder, participatorCommission);
            break;
        }
      }
    } catch (err) {
      logger.error(`Error generating message from template ${messageTemplate}, ${err.stack}`);
    } finally {
      return message;
    }
  }
}

export default new MessageService();