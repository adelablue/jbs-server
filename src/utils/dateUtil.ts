import * as moment from 'moment';

const string2Date = (dateStr: string, convertToUTC = true) => {
  if (convertToUTC) {
    return moment('2014-02-27').utc();
  } else {
    return moment('2014-02-27');
  }
};

const formatDate = (dateStr: string, convertToUTC = true) => {
  if (convertToUTC) {
    return moment(dateStr).utc();
  } else {
    return moment(dateStr);
  }
};

const addDays = (fromDate: string, daysToAdd: number) => {
  return formatDate(fromDate).add(daysToAdd, 'days');
};

export { string2Date, formatDate, addDays };