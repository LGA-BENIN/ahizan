
import { request, gql } from 'graphql-request';

const query = gql`
  query {
    __type(name: "CreateVendorInput") {
      name
      inputFields {
        name
        type {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
  }
`;

async function check() {
    try {
        const data: any = await request('http://localhost:3000/shop-api', query);
        const fields = data.__type.inputFields;
        const nameField = fields.find((f: any) => f.name === 'name');

        console.log('Name field type:', JSON.stringify(nameField.type, null, 2));

        if (nameField.type.kind === 'NON_NULL') {
            console.log('FAIL: Name is still NON_NULL (Required)');
        } else {
            console.log('SUCCESS: Name is Nullable (Optional)');
        }
    } catch (error) {
        console.error('Error fetching schema:', error);
    }
}

check();
