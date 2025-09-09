import { memberships_object } from '../../constants';
import { dateToString } from '../../utils/firebase';

export function Subscription(user: any): string {
  const fecha = dateToString(user.membership_started_at);

  const membership = memberships_object[user.membership as Memberships];
  const membershipHtml = membership
    ? `
    <div style="display: flex; align-items: center; background-color: #f0f0f0; padding: 20px; margin: 0px 60px; border-radius: 15px 0% 35px 0%; text-align: left;">
        <img src="${membership.img_url}" alt="Imagen de Membresía" style="margin-right: 20px; margin: -50px 30px 0px 0px; width: 100px; height: 120px;">
        <div>
            <p style="font-family: Inter, sans-serif; font-size: 14px; color: #1a2229;">
            <strong>Nombre:</strong> <span style="color: purple;">${user.name}</span> <br>
            <strong>Fecha:</strong> <span style="color: purple;">${fecha}</span> <br>
            <strong>Membresía:</strong> <span style="color: purple;">${membership.display}</span>
            </p>
        </div>
    </div>`
    : '';
  return `
      <div>
        <style>
          @media (prefers-color-scheme: dark) {
            .darkmode-color {
              color: #ffffff !important;
            }
          }
        </style>
        <table border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width: 700px; margin: 0 auto;" align="center">
          <tr>
            <td align="center" valign="middle" bgcolor="#ffffff" style="padding: 30px 10px;">
              <!-- Imagen de cabecera -->
              <table border="0" cellspacing="0" cellpadding="0" width="100%" style=" margin: 0 auto;" align="center">
                <tr>
                  <td align="center" valign="middle">
                    <a href="#" target="_blank" style="font-family: Arial, sans-serif; font-size: 14px; color: #000000;">
                      <img src="https://firebasestorage.googleapis.com/v0/b/gibor-428900.appspot.com/o/email-images%2Fheader.png?alt=media&token=f0949cb4-ae6f-4aa6-96fb-19e75a0e9139" width="100%" height="auto" alt="" border="0" style="display: block; border-radius: 0px; object-fit: contain; object-position: center;">
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Texto de bienvenida -->
              <div style="padding: 20px; text-align: justify;">
                <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">¡Hola <span style="color: purple">${user.name}</span></p>
                <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">
                <strong>¡Bienvenido a Gibor!</strong> Estamos encantados de tenerte en nuestra familia de Emprendedores. Aquí, no solo encontrarás una oportunidad de negocio, sino también un camino hacia el crecimiento personal y profesional con los diferentes contenidos educativos que tenemos preparado cuidadosamente para ti.
                </p>
                <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">
                  En Gibor, creemos en el poder de la colaboración y el espíritu emprendedor. Juntos, alcanzaremos nuevas alturas y transformaremos vidas.
                </p>
                <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">
                  Prepárate para descubrir un mundo de posibilidades, donde tu éxito es nuestra prioridad. ¡Vamos a construir un futuro brillante y próspero, mano a mano!
                </p>
              </div>

              <!-- Información de la membresía  -->
            ${membershipHtml}
              
              <!-- Footer -->
              <img src="https://storage.googleapis.com/gibor-428900.appspot.com/email-images/Footer2.png" width="100%" height="auto" style="object-fit: contain;" />

            </td>
          </tr>
        </table>
      </div>
    `;
}

export function Sponsor(user: any, sponsor: any): string {
  return `
    <html>
      <body>
        <div class="body">
          <table border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width: 700px; margin: 0 auto;" align="center">
            <tr>
              <td align="center" valign="middle" style="padding: 30px 10px;">
                <!-- Imagen de cabecera -->
                <table border="0" cellspacing="0" cellpadding="0" width="100%" style=" margin: 0 auto;" align="center">
                  <tr>
                    <td align="center" valign="middle">
                      <a href="#" target="_blank" style="font-family: Arial, sans-serif; font-size: 14px; color: #000000;">
                        <img src="https://storage.googleapis.com/gibor-428900.appspot.com/email-images/header%202.png" width="100%" height="auto" alt="" border="0" style="display: block; border-radius: 0px; object-fit: contain; object-position: center;">
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Texto de bienvenida -->
                <div style="padding: 20px; text-align: justify;">
                  <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">
                    ¡Hola <span style="color: purple">${sponsor.name}</span>!
                  </p>
                  <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">
                    <strong>¡Felicidades!</strong> 🎉 Nos complace informarte que tu afiliado <span style="color: purple;">${user.name}</span> acaba de pagar su membresía <span style="color: purple;">${user.membership}</span>. Ya puedes ver en tu <a href="#" style="color: purple;">Backoffice</a> reflejado tu comisión directa 💸💸.
                  </p>
                  <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">
                    Este es un gran paso hacia el éxito y crecimiento en tu negocio. Tu dedicación y esfuerzo están dando frutos, y estamos emocionados de ver cómo tu equipo sigue expandiéndose 🚀. Este logro no solo refleja tu compromiso, sino también el potencial ilimitado que tienes para alcanzar nuevas metas.
                  </p>
                  <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">
                    Sigue inspirando y guiando a tu equipo con la misma pasión. ¡El futuro es brillante y lleno de oportunidades! 🌟
                  </p>
                  <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">
                    Vamos a celebrar este momento de éxito y a seguir construyendo juntos un camino de prosperidad.
                  </p>
                  <p style="font-family: Inter, sans-serif; font-size: 16px; color: #1a2229; line-height: 1.6;">
                    Con entusiasmo, TeamGibor.
                  </p>
                </div>

                <!-- Footer  -->
                <img src="https://storage.googleapis.com/gibor-428900.appspot.com/email-images/Footer2.png" width="100%" height="auto" style="object-fit: contain;" />

                <!-- Redes sociales -->
                <!--<div style="text-align: right; margin-top: 32px;">
                    <a href="#"><img src="https://firebasestorage.googleapis.com/v0/b/gibor-428900.appspot.com/o/email-images%2Ffb.png?alt=media&token=675c3f01-bf42-4399-bb2f-994777f0f668" width="24" height="24" alt="Facebook" style="margin-right: 10px;"></a>
                    <a href="#"><img src="https://firebasestorage.googleapis.com/v0/b/gibor-428900.appspot.com/o/email-images%2Fyt.png?alt=media&token=99c5d52c-cafe-4fe4-a0a2-848b873692b8" width="24" height="24" alt="YouTube" style="margin-right: 10px;"></a>
                    <a href="#"><img src="https://firebasestorage.googleapis.com/v0/b/gibor-428900.appspot.com/o/email-images%2Fig.png?alt=media&token=306538b2-254e-4889-b117-282341136cbb" width="24" height="24" alt="Instagram"></a>
                </div>-->
              </td>
            </tr>
          </table>
        </div>
      </body>
    </html>
    `;
}
