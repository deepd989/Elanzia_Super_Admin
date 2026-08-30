// The slice registry. One entry per feature area, and this is the only
// place a new slice is wired in.
//
// The key here is the state key screens select against: state.access.
import accessReducer from './accessSlice';
import growthReducer from './growthSlice';
import marketplaceReducer from './marketplaceSlice';
import catalogueReducer from './catalogueSlice';
import communicationsReducer from './communicationsSlice';
import logisticsReducer from './logisticsSlice';
import onboardingReducer from './onboardingSlice';
import operationsReducer from './operationsSlice';
import ordersReducer from './ordersSlice';
import paymentsReducer from './paymentsSlice';
import taxReducer from './taxSlice';
import pricingReducer from './pricingSlice';
import reportingReducer from './reportingSlice';
import supportReducer from './supportSlice';
import trustReducer from './trustSlice';

export const reducers = {
  access: accessReducer,
  growth: growthReducer,
  marketplace: marketplaceReducer,
  catalogue: catalogueReducer,
  communications: communicationsReducer,
  logistics: logisticsReducer,
  onboarding: onboardingReducer,
  operations: operationsReducer,
  orders: ordersReducer,
  payments: paymentsReducer,
  tax: taxReducer,
  pricing: pricingReducer,
  reporting: reportingReducer,
  support: supportReducer,
  trust: trustReducer,
};
