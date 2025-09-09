import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { db } from '../firebase/admin';
import { dateToString } from '../utils/firebase';

const DOMAIN = `https://admin.dota.click`;
const CURRENCY = 'USD';

const login: any = {
  DalePlay2: '6808162',
  Cargaya2: '6808178',
  Apuestashoy2: '6808183',
  Fichitas2: '6808190',
  Juegolandia2: '6808196',
  Tucasino2: '6808209',
  Facilbet2: '6808212',
  Zino3: 'Zino3-sub',
  Winzo2: 'Winzo2-sub',
  Roleta2: 'Roleta2-sub',
};

@Injectable()
export class CasinoService {
  async getToken(cashier: string) {
    const url = `${DOMAIN}/index.php?act=admin&area=login&response=js`;
    const formdata = new FormData();
    formdata.append('login', login[cashier]);
    formdata.append('password', 'Casino123');
    const res = await axios.post(url, formdata);

    return res.data.token;
  }

  async addCredits(
    cashier: string,
    tokenuser: string,
    amount: number,
    transaction_id: string,
  ) {
    const userid = await this.getIdUser(tokenuser);

    const token = await this.getToken(cashier);
    const url = `${DOMAIN}/index.php?act=admin&area=balance&type=frame&response=js&token=${token}&id=${userid}`;
    const formdata = new FormData();
    formdata.append('send', 'true');
    formdata.append('operation', 'in');
    formdata.append('amount', amount.toString());
    formdata.append('balance_currency', CURRENCY);
    const res = await axios.post(url, formdata);
    const status = res.data.successMessage == 'Balance successfully changed';

    await db.collection('casino-transactions').doc(transaction_id).set({
      status: 'approved',
      approved_at: new Date(),
      amount,
    });

    await db
      .collection('disruptive-casino')
      .doc(transaction_id)
      .collection('responses')
      .add({
        created_at: new Date(),
        data: res.data,
      });

    return status ? res.data.successMessage : 'Failed balance';
  }

  async removeCredits(cashier: string, userid: number, amount: number) {
    const token = await this.getToken(cashier);
    const url = `${DOMAIN}/index.php?act=admin&area=balance&type=frame&response=js&token=${token}&id=${userid}`;
    const formdata = new FormData();
    formdata.append('send', 'true');
    formdata.append('operation', 'out');
    formdata.append('amount', amount.toString());
    formdata.append('balance_currency', CURRENCY);
    await axios.post(url, formdata);
    return true;
  }

  async isValid(token: string) {
    const url = `https://dota.click/api.php?type=query`;
    const res = await axios.post(url, {
      cmd: 'terminalInfo',
      first: true,
      cache: false,
      session: null,
      token: token,
      version: 9,
      domain: 'https://api.dota.click',
    });
    return Boolean(res.data?.content?.id);
  }

  async getIdUser(token: string) {
    const url = `https://dota.click/api.php?type=query`;
    const res = await axios.post(url, {
      cmd: 'terminalInfo',
      first: true,
      cache: false,
      session: null,
      token: token,
      version: 9,
      domain: 'https://api.dota.click',
    });
    return res.data.content.id;
  }

  async getBalance(token: string) {
    const url = `https://dota.click/api.php?type=query`;
    const res = await axios.post(url, {
      cmd: 'terminalInfo',
      first: true,
      cache: false,
      session: null,
      token: token,
      version: 9,
      domain: 'https://api.dota.click',
    });
    return Number(res.data.content.cash);
  }

  async getTransactions(userid: number) {
    const transactions = await db
      .collection('casino-transactions')
      .where('userid', '==', userid)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();

    return transactions.docs.map((r) => ({
      created_at: dateToString(r.get('created_at')),
      amount: r.get('amount'),
      status: r.get('status'),
      type: r.get('type'),
      address: r.get('address'),
    }));
  }
}
