import * as yup from "yup";

export const pushSubscribeSchema = yup.object({
  endpoint: yup.string().trim().url().required(),
  keys: yup
    .object({
      p256dh: yup.string().trim().required(),
      auth: yup.string().trim().required(),
    })
    .required(),
});
