import { getCompanies, getCompanyGroups, getCompanyGroupMembers, getCountries } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import CompaniesClient from './CompaniesClient';

export default async function CompaniesPage() {
  const [companies, groups, members, countries] = await Promise.all([
    getCompanies(),
    getCompanyGroups(),
    getCompanyGroupMembers(),
    getCountries(),
  ]);

  return (
    <div>
      <Topbar title="Companies" />
      <div className="px-6 py-5">
        <CompaniesClient
          companies={companies}
          groups={groups}
          members={members}
          countries={countries}
        />
      </div>
    </div>
  );
}
