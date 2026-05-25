#!/bin/bash
echo "Deploying updated Firestore rules..."
firebase deploy --only firestore:rules --project oil-delivery-6bcc4
echo "Rules deployed successfully!"