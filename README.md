### Installation

Once you've cloned the code and repository, follow the following commands in the CLI

- Navigate to the root of the functions folder and run `npm install`
- Navigate back to the root of the entire project and run `firebase serve --only functions`

This runs the development server for the frontend which is in a seperate folder



- Destination subscription charge requires the customer to have a default payment method but ours does not because firebase does this automatically 

- checkout sessions in subscription mode does not have option to transfer to connected accounts like payment mode

- is there a way to merge the two together? allow users to input payment method through a checkout session and then use destination subscription charge to transfer the funds to the designated connected account