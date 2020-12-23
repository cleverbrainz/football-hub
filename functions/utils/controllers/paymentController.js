const stripe = require('stripe')('sk_test_51I1Hn1ALEtU1IcJjm6O7qVUwQbohcEROksl05BLLndsx4j8xigVkdtMwn25CmQV0aet45bCPnLe5TE7MVf1ZkMWk00GXvZvWHZ')
const YOUR_DOMAIN = 'http://localhost:3000/checkout'


exports.createStripePayment = async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Stubborn Attachments',
            images: ['https://i.imgur.com/EHyR2nP.png']
          },
          unit_amount: 2000
        },
        quantity: 1
      }
    ],
    mode: 'payment',
    success_url: `${YOUR_DOMAIN}?success=true`,
    cancel_url: `${YOUR_DOMAIN}?canceled=true`
  })
  res.json({ id: session.id })
}