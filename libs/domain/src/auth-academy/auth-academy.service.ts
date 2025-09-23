import { Injectable } from '@nestjs/common';
import { USER_ROLES } from 'apps/backoffice-api/src/auth/auth.constants';
import { RegisterAuthDto } from 'apps/backoffice-api/src/auth/dto/register-auth.dto';
import { Bonds } from 'apps/backoffice-api/src/bonds/bonds';
import { db } from 'apps/backoffice-api/src/firebase/admin';
import { hash } from 'bcryptjs';

function makeid(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

@Injectable()
export class AuthAcademyService {
  async registerUser(userObject: RegisterAuthDto) {
    let sponsor_name = null;
    let position = null;

    if (userObject.sponsor_id) {
      const sponsor = await db
        .collection('users')
        .doc(userObject.sponsor_id)
        .get();
      position = sponsor.get('left') == userObject.side ? 'left' : 'right';
      sponsor_name = sponsor.get('name');
    }

    const formattedUser = await this.formatNewUser(userObject);

    const user = await db
      .collection('users')
      .add({ ...formattedUser, position, sponsor_name });

    await user.update({
      nft: {
        status: 'pending',
        data: {
          name: 'DotaNFT',
          description: 'Este NFT es otorgado por adquirir tu membresia en dota',
          image: 'https://www.dotaacademy.com/public/nft.webp',
          attributes: [
            {
              trait_type: 'identifier',
              value: user.id,
            },
          ],
        },
      },
    });

    return {
      id: user.id,
      ...formattedUser,
    };
  }

  async getPassword(pass: string) {
    return hash(pass, 10);
  }

  async formatNewUser(userObject: RegisterAuthDto) {
    const { name, email, password: plainPass } = userObject;
    const plainToHash = await this.getPassword(plainPass);
    const roles = [USER_ROLES.USER];

    return {
      name,
      password: plainToHash,
      email: email.toLowerCase(),
      roles,
      sponsor_id: userObject.sponsor_id,
      created_at: new Date(),
      updated_at: new Date(),
      profits: 0,
      balance: 0,
      is_new: true,
      left: userObject.refCodeL || makeid(6),
      right: userObject.refCodeR || makeid(6),
      country: userObject.country,
      whatsapp: userObject.phone,
      username: userObject.username,

      membership: null,
      membership_started_at: null,
      membership_expires_at: null,

      // CONTADORES
      count_direct_people: 0,
      count_underline_people: 0,
      month_sales_volumen: 0,
      deposits: 0,
      compound_interest: false,

      // BONOS
      [Bonds.DIRECT]: 0,
      [Bonds.BINARY]: 0,
      [Bonds.REWARD]: 0,
      [Bonds.RANK]: 0,
      [`pending_${Bonds.DIRECT}`]: 0,
      [`pending_${Bonds.BINARY}`]: 0,
      [`pending_${Bonds.REWARD}`]: 0,
      [`pending_${Bonds.RANK}`]: 0,

      [`balance_${Bonds.DIRECT}`]: 0,
      [`balance_${Bonds.BINARY}`]: 0,
      [`balance_${Bonds.REWARD}`]: 0,
      [`balance_${Bonds.RANK}`]: 0,

      is_binary_active: false,

      left_points: 0,
      right_points: 0,
    };
  }
}
