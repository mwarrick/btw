-- Signups made up by lib/simulations.js to show how the flow works. They
-- use fictional 555-01xx numbers, are badged in /admin, and nothing is
-- ever texted to them.
alter table btw_churches add column simulated boolean not null default false;
