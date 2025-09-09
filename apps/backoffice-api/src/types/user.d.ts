type User = {
  uid: string;
  name: string;
  email: string;
  password: string;
  roles: string[];
  is_admin?: boolean;
};
